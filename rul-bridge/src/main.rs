//! RUL native proof bridge: verifies d = 13 + 9*t2 + 3*t1 + t0 for all Base27 symbols.
//! RUL verifies the numeric SSA-DAG and compares three engines; Rust creates the
//! exhaustive balanced trit table independently. This does NOT verify CVNSS Unicode.

use std::collections::HashSet;
use rul::bytecode::{Opcode, ScheduleHint, TypeLane, CAP_NONE, RulProgram};
use rul::engine::{execute_tier0_interpreter, execute_tier1_stencil, execute_tier2_fused, RuntimeValue};
use rul::transpiler::SymbolicGraphBuilder;
use rul::verifier::verify_program;

const BASE:i32 = 27;
fn to_trits(d:i32)->[i32;3] {
    assert!((0..BASE).contains(&d));
    let mut value=d-13;
    let mut t=[0i32;3];
    for (i,weight) in [9,3,1].iter().enumerate() {
        let bound=(weight-1)/2;
        let digit=if value>bound {1} else if value < -bound {-1} else {0};
        t[i]=digit;
        value-=digit*weight;
    }
    assert_eq!(value,0);
    t
}
fn build() -> Result<RulProgram,String> {
    let mut g=SymbolicGraphBuilder::new(CAP_NONE);
    let s=ScheduleHint::fused_simd(1);
    for (label,_) in [("$d",0),("$t2",1),("$t1",2),("$t0",3)] {
        let arena=g.add_arena(32,TypeLane::F64X8,false);
        g.emit_arena_input(label,arena,1,s).map_err(|e|e.to_string())?;
    }
    for (label,x) in [("$nine",9.0),("$three",3.0),("$thirteen",13.0)] {
        g.emit_const_f64(label,x,s).map_err(|e|e.to_string())?;
    }
    let ops=[
       ("$p2",Opcode::Mul,"$t2","$nine"),
       ("$p1",Opcode::Mul,"$t1","$three"),
       ("$part",Opcode::Add,"$p2","$p1"),
       ("$sum",Opcode::Add,"$part","$t0"),
       ("$reconstructed",Opcode::Add,"$sum","$thirteen"),
       ("$difference",Opcode::Sub,"$reconstructed","$d"),
       ("$square",Opcode::Mul,"$difference","$difference")
    ];
    for (label,op,a,b) in ops {
      g.emit_binary_op(label,op,TypeLane::F64X8,a,b,s).map_err(|e|e.to_string())?;
    }
    g.emit_unary_op("$error",Opcode::ReduceSum,TypeLane::F64_SCALAR,"$square",s).map_err(|e|e.to_string())?;
    g.emit_unary_op("$assert",Opcode::AssertContract,TypeLane::F64_SCALAR,"$error",s).map_err(|e|e.to_string())?;
    g.finish("$assert").map_err(|e|e.to_string())
}
fn val(result:RuntimeValue)->Result<f64,String>{
   match result {RuntimeValue::Scalar(x)=>Ok(x),other=>Err(format!("Unexpected output: {other:?}"))}
}
fn main() -> Result<(),Box<dyn std::error::Error>> {
    let g=build()?;
    let verified=verify_program(&g).map_err(|e|format!("{e:?}"))?;
    let bin=g.to_rl_bytes();
    let restored=RulProgram::from_rl_bytes(&bin).map_err(|e|format!("{e:?}"))?;
    if restored!=g {return Err("RUL binary serialize/deserialize mismatch".into())}
    let mut columns=[vec![13.0f64;32],vec![0.0;32],vec![0.0;32],vec![0.0;32]];
    let mut unique=HashSet::new();
    for d in 0..BASE{
        let t=to_trits(d);
        if !unique.insert(t) {return Err("Trit collision detected".into())}
        let reconstructed=13+9*t[0]+3*t[1]+t[2];
        if reconstructed!=d {return Err(format!("Inverse failed for Base27 digit {d}").into())}
        let i=d as usize;
        columns[0][i]=d as f64;
        columns[1][i]=t[0] as f64;
        columns[2][i]=t[1] as f64;
        columns[3][i]=t[2] as f64;
    }
    if unique.len()!=27{return Err("Expected 27 unique balanced trit triples".into())}
    let inputs:Vec<&[f64]>=columns.iter().map(Vec::as_slice).collect();
    let r0=val(execute_tier0_interpreter(&g,&inputs)?.output)?;
    let r1=val(execute_tier1_stencil(&g,&inputs)?.output)?;
    let r2=val(execute_tier2_fused(&g,&inputs)?.output)?;
    if [r0,r1,r2].iter().any(|v|*v!=0.0){
        return Err(format!("RUL differential error, expected 0.0; observed {r0},{r1},{r2}").into())
    }
    println!("BASE27 PROVEN BY EXHAUSTION: 27 unique triples and 27/27 inverses");
    println!("RUL BINARY SSA-DAG VERIFIED: {} nodes, {} bytes", verified.node_count,bin.len());
    println!("RUL NUMERICAL DIFFERENTIAL: Tier0={} Tier1={} Tier2={} (sum squared error=0)",r0,r1,r2);
    println!("LIMIT: verified finite mapping and RUL numeric graph safety, NOT universal CVNSS lossless or LLM efficiency");
    Ok(())
}
