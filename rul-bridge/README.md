# RUL Native Bridge · Verified Base27 arithmetic DAG

This bridge imports the actual Rust [RUL](https://github.com/xulytiengviet/rul) crate pinned to a particular commit. It constructs an SSA-DAG with RUL's `SymbolicGraphBuilder`, runs `verify_program`, serializes and deserializes a 128-bit `.rl` graph, then compares Tier 0 / Tier 1 / Tier 2 scalar outputs.

The native Rust bridge computes the full 27-entry balanced-trit mapping, confirms all 27 triples are distinct, and constructs a real RUL SSA-DAG to reconstruct each digit as `13 + 9*t2 + 3*t1 + t0`. Four 32-element `f64` arenas carry `d`, `t2`, `t1` and `t0` (5 padded rows contain d=13 and zero trits). The graph computes the sum of squared reconstruction errors: **0** under Tier 0, Tier 1 and Tier 2. The bounded 27-state bijection is additionally checked by Node tests. RUL does not contain a CVNSS tokenizer, a formal Unicode verifier, or a physical ternary chip.

Run with Rust and Git installed:
```bash
cargo run --manifest-path rul-bridge/Cargo.toml --release
```

The pinned upstream license is `MIT OR Apache-2.0`. Please retain attribution from the upstream `NOTICE` for redistributed upstream code.
