//! RUL core integration test, distinct from a proof of CVNSS4.0 codec semantics.
//! Constructs the graph: input digit d -> sub(d,13) -> add(.,13) -> reduce sum.
//! The JS/Node test suite proves the discrete 27-state trit bijection separately.

use rul::bytecode::{Opcode, ScheduleHint, TypeLane, CAP_NONE, RulProgram};
use rul::engine::{execute_tier0_interpreter, execute_tier1_stencil, execute_tier2_fused, RuntimeValue};
use rul::transpiler::SymbolicGraphBuilder;
use rul::verifier::verify_program;

fn build() -> Result<RulProgram, String> {
    let mut g = SymbolicGraphBuilder::new(CAP_NONE);
    let arena = g.add_arena(32, TypeLane::F64X8, false);
    let hint = ScheduleHint::fused_simd(1);
    g.emit_arena_input("$digits", arena, 1, hint).map_err(|e| e.to_string())?;
    g.emit_const_f64("$bias", 13.0, hint).map_err(|e| e.to_string())?;
    g.emit_binary_op("$shifted", Opcode::Sub, TypeLane::F64X8, "$digits", "$bias", hint).map_err(|e| e.to_string())?;
    g.emit_binary_op("$restored", Opcode::Add, TypeLane::F64X8, "$shifted", "$bias", hint).map_err(|e| e.to_string())?;
    g.emit_unary_op("$sum", Opcode::ReduceSum, TypeLane::F64_SCALAR, "$restored", hint).map_err(|e| e.to_string())?;
    g.emit_unary_op("$assert", Opcode::AssertContract, TypeLane::F64_SCALAR, "$sum", hint).map_err(|e| e.to_string())?;
    g.finish("$assert").map_err(|e| e.to_string())
}
fn value(v: RuntimeValue) -> Result<f64,String> {
    match v { RuntimeValue::Scalar(x)=>Ok(x), other=>Err(format!("Unexpected output: {other:?}")) }
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let g=build()?;
    let summary=verify_program(&g).map_err(|e|format!("{e:?}"))?;
    let bytes=g.to_rl_bytes();
    let restored=RulProgram::from_rl_bytes(&bytes).map_err(|e|format!("{e:?}"))?;
    if restored != g {return Err("RUL binary graph roundtrip mismatch".into())}
    let mut digits=vec![0.0f64;32];
    for (i,d) in digits.iter_mut().take(27).enumerate(){*d=i as f64}
    let args: &[&[f64]]=&[&digits];
    let a=value(execute_tier0_interpreter(&g,args)?.output)?;
    let b=value(execute_tier1_stencil(&g,args)?.output)?;
    let c=value(execute_tier2_fused(&g,args)?.output)?;
    const EXPECTED:f64=351.0; // sum of 0..26
    if [a,b,c].iter().any(|&x|x!=EXPECTED) {
       return Err(format!("RUL differential mismatch: expected {EXPECTED}; got {a}, {b}, {c}").into())
    }
    println!("RUL VERIFIED: {} nodes, {} .rl bytes, sum T0/T1/T2={a}/{b}/{c}",summary.node_count,bytes.len());
    println!("SCOPE: numerical Base27 identity DAG and RUL SSA-DAG safety verified.");
    println!("NOT CLAIMED: full Unicode CVNSS losslessness, ternary physical gates, or LLM efficiency.");
    Ok(())
}
