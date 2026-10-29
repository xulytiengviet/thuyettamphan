# RUL Native Bridge · Verified Base27 arithmetic DAG

This bridge imports the actual Rust [RUL](https://github.com/xulytiengviet/rul) crate pinned to a particular commit. It constructs an SSA-DAG with RUL's `SymbolicGraphBuilder`, runs `verify_program`, serializes and deserializes a 128-bit `.rl` graph, then compares Tier 0 / Tier 1 / Tier 2 scalar outputs.

Demo identity: d - 13 + 13 = d for the 27 integer digit values 0..26, padded with five zeros in a 32-element column, and reduced to 351. This is **not** the complete balanced-trit bijection in RUL opcodes. The full integer ternary bijection is exhaustively checked by Node tests. RUL does not contain a CVNSS tokenizer, formal Unicode verifier, or a physical ternary chip.

Run with Rust and Git installed:
```bash
cargo run --manifest-path rul-bridge/Cargo.toml --release
```

The pinned upstream license is `MIT OR Apache-2.0`. Please retain attribution from the upstream `NOTICE` for redistributed upstream code.
