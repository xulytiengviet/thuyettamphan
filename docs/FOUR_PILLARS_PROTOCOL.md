# Giao thức đánh giá 4 trụ cột · VT-PROOF v1

**Dự án:** Thuyết Tam Phân · Long Ngo phát triển  
**Cấu phần:** CVNSS4.0–Base27–RUL, tokenizer tiếng Việt và AI trọng số tam phân  
**Tình trạng:** Bài toán 1 có chứng minh hữu hạn; P2/P3 là thử nghiệm định dạng/chẩn đoán; P4 chưa có mô hình được huấn luyện trong dự án.

## Phân tầng

```text
          Vietnamese Unicode (scalar values, byte-exact UTF-8)
                             │
              CVNSS Converter v5 (CQN→CVSS)
                             │
         ┌───────────────────┴─────────────────┐
         │ base27 run (A–Z + SPACE)            │ UTF8-pair27 for exceptional spans
         └───────────────┬─────────────────────┘
                  balanced ternary (3 trit per Base27 digit)
                             │
               Unicode sidecar / exact edits
                             │
                    Verified T27-LP2 packet
                             │
              [optional] patch/tokenizer modeling
                             │
                  weight-ternary Transformer
                             │
                validated Vietnamese evaluation
```

- **RUL native bridge:** toán học Base27, độc lập verifier RUL 16 node, Tier 0/1/2.
- **Giao thức LP2:** cụm chữ thường + khoảng trắng được biểu diễn trực tiếp; chỉ cụm ký tự ngoài tập mới dùng mã UTF-8 theo cặp chữ số Base27; sidecar bổ sung phục hồi Unicode.
- **Thứ tự bằng chứng:** định lý → kiểm thử trên corpus → benchmark tokenizer → huấn luyện + benchmark có kiểm soát.

## P1. Định lý

Miền ký hiệu Sigma={SPACE,A,...,Z}, d∈{0,...,26}. Với tam phân cân bằng t∈{-1,0,+1}³:

`d = 13 + 9*t2 + 3*t1 + t0`.

Vì miền ba trit có đúng 27 phần tử và các tổng bao trùm {-13,...,+13} duy nhất, phép ánh xạ là song ánh. Chạy kiểm tra duyệt hết 27 bộ trong thư viện JS và qua RUL Rust; phép đối chiếu số học RUL được thực thi thật qua CI.

- **Tiêu chí:** 27/27 được giải ngược; 27/27 bộ khác nhau; không có mã không thể giải. PASS đã có.
- **Đối chứng:** 5 bit cần 32 trạng thái; 3 trit cần đúng 27.
- **Không suy ra:** 3 trit chiếm 3 bit vật lý, hoặc năng lượng giảm 40%.

## P2. Lossless Unicode và kiểm toán converter

**Phản ví dụ từ converter:** `iên/yên` cùng mã `ily`; `oà/òa` cùng mã `oal`. Do đó CVNSS4.0 thuần không đơn ánh.

Gói `T27-LP2`: `{format,version,converterVersion,transport:{mode:"mixed27-v1",spans:[{mode,digits}]},patches,utf8Sha256,utf8Length}`.

- Ký hiệu `[a-z ]` dùng 1 chữ số Base27/ký hiệu.
- Chuỗi ngoài tập dùng `UTF8(b) → [floor(b/27),b mod 27]` cho mỗi byte.
- Mỗi chữ số Base27 dùng 3 trit cân bằng.
- Bản giải CVNSS canonical + sidecar chỉnh sửa theo vị trí Unicode scalar được kiểm tra so với byte UTF-8 gốc.
- Chuỗi UTF-16 có surrogate đơn lẻ bị loại để giữ miền là các chuỗi Unicode scalar hợp lệ.

**Kiểm thử tự động:** corpus mẫu train/holdout; Unicode NFC/NFD, emoji, chữ hoa, dấu thanh, số, dấu câu, trường hợp nhập nhằng; roundtrip LP1/LP2, lỗi khi sửa dữ liệu, đo byte từng gói và sidecar.

**Ghi chú quan trọng:** `utf8Sha256` phát hiện thay đổi khi có digest đáng tin; không xác minh nguồn gốc người gửi. LP2 không chứng minh sidecar tối thiểu, khả năng nén hoặc khả nghịch toàn bộ miền trong mọi điều kiện. Độ dài gói JSON có thể lớn hơn dữ liệu gốc.

## P3. Tokenizer trên dữ liệu có kiểm soát

Corpus chẩn đoán nằm ở `data/vietnamese_eval_v1.json`, có train/holdout tách riêng, được biên soạn cho demo, **không đại diện thống kê**. Cố ý bao gồm ngoại lệ Unicode, dấu câu và thuật ngữ kỹ thuật.

Hai bộ mini byte-BPE tách biệt huấn luyện trên:
1. Byte UTF-8 của train CQN.
2. Byte UTF-8 của train CVNSS4.0.

Thuật toán thực hiện tuần tự tối đa 96 phép ghép byte-pair dựa trên tần số; decoder giải ngược chuỗi token. Số token được đo **chỉ trên split holdout**.

Báo cáo đồng thời:
- UTF-8 byte baseline;
- Unicode codepoints;
- số token của mini-BPE gốc và mini-BPE CVNSS;
- số chữ số Base27 và ba trit tương ứng ở LP1/LP2;
- byte gói LP1/LP2, sidecar, số đoạn escape;
- phép thử giải mã ngược của mini-BPE.

**Không phải kết luận về BPE32K:** bảng 256+96 mini BPE này khác hoàn toàn tokenizer của các LLM thực tế; không đo hiệu quả huấn luyện và không so sánh chất lượng. Các kết quả token CVNSS chưa cộng chi phí sidecar nên không thể dùng đơn lẻ để tuyên bố tiết kiệm tổng chi phí.

Để mở rộng P3 thành benchmark học thuật: bổ sung corpus có cấp phép và kích thước đủ lớn, ít nhất hai baseline tokenizer Việt ngữ hiện đại với **tokenizer thật**, đánh giá theo byte văn bản gốc; tính mọi escape, lossless metadata; đo chi phí end-to-end thay vì chỉ độ dài chuỗi.

## P4. Evidence gate cho LLM trọng số tam phân

**Chưa có benchmark LLM mới trong repo.** Hệ thống chỉ nhận hồ sơ JSON từ kết quả đo thực tế. Mẫu trống: `data/llm_evidence_template_v1.json`.

Một hồ sơ hợp lệ (`schema:vt-llm-eval/v1`) cần:
- Hai arm trở lên; arm baseline được định danh bằng `baseline_id`.
- Ít nhất **3 hạt giống độc lập** cho mỗi arm.
- Cùng `dataset_sha256`, `hardware_id`, `eval_protocol`.
- Có `tokenizer_version`, `model_commit`.
- Training FLOPs và model params sai khác **không quá 5%** giữa baseline và phương án thử.
- Có `score_pct`, `inference_flops_per_utf8_byte`, `joule_per_utf8_byte`, `latency_ms_per_utf8_byte`, `peak_ram_mb`.

Ngưỡng mục tiêu phân tích (chưa đo):
- Độ giảm chất lượng không quá 1 điểm phần trăm;
- tiết kiệm ít nhất 20% FLOPs suy luận trên mỗi byte đầu ra;
- tiết kiệm ít nhất 20% joule trên mỗi byte đầu ra.

Khi báo cáo đạt schema và các ngưỡng dựa trên giá trị được nhập, UI chỉ hiển thị **"Hồ sơ định dạng hợp lệ; dữ liệu người dùng cung cấp, chưa kiểm chứng độc lập"**, không tuyên bố đã có huấn luyện.

Cần thực nghiệm M0–M6 theo thứ tự:

| Arm | Dữ liệu/Tokenizer | Lõi |
|---|---|---|
| M0 | Unicode + BPE 32K | Transformer đối chứng |
| M1 | Unicode + SentencePiece 8K | Transformer |
| M2 | UTF-8 byte-level | Transformer |
| M3 | CVNSS + 27 ký hiệu + lossless sidecar | Transformer |
| M4 | CVNSS + BPE/Unigram 8K | Transformer |
| M5 | CVNSS + 3-trit embedding + adaptive patch | Transformer |
| M6 | M5 | Trọng số tam phân BitNet-style |

**Phân tích thống kê cần bổ sung**: confidence intervals theo seed, phương sai, robustness từng nhóm văn bản, các tác vụ tiếng Việt, kiểm thử out-of-distribution và đánh giá độ dài ngữ cảnh. Ngưỡng trên chỉ là lựa chọn nghiên cứu, không thay thế kiểm định thống kê hoặc bằng chứng nguyên nhân–kết quả.

## Quy trình tái lập

```bash
npm test
npm run evaluate
cargo run --release --manifest-path rul-bridge/Cargo.toml
```

- `npm run evaluate` xuất `reports/evaluation-v1.json` chứa hash SHA-256 của corpus, source evaluator, codec LP2 và converter, cộng commit GitHub nếu chạy CI.
- CI tạo artifact `thuyettamphan-four-pillar-diagnostics`, kiểm thử P1–P4 schema và thực thi RUL native.
- GitHub Pages hiển thị phép đo tại trình duyệt và cho tải trực tiếp báo cáo JSON.
- Các câu minh họa nội bộ nằm riêng trong corpus; các test P4 giả lập **chỉ kiểm tra logic validator**, tuyệt đối không đi vào báo cáo benchmark.

## Nguồn tham chiếu bên ngoài

- [Meta BLT (ACL 2025)](https://aclanthology.org/2025.acl-long.453/): byte-level dynamic patches, đối chứng khi hướng nghiên cứu triển khai patch-based training.
- [Microsoft BitNet](https://github.com/microsoft/BitNet): trọng số `{-1,0,+1}` và hệ thống inference; không trực tiếp chứng minh tokenizer CVNSS.
- [RUL v0.1](https://github.com/xulytiengviet/rul): Rust SSA-DAG và xác minh an toàn đồ thị (không tự chứng minh Unicode).
- [Base27-CVNSS](https://base27-cvnss.github.io/): quy ước SPACE=0, A=1,...,Z=26.

**Kết luận:** tối ưu hóa tại tầng biểu diễn toán học đã chứng minh, nhưng tối ưu hóa ở tầng mô hình ngôn ngữ và hiệu năng thiết bị vẫn là câu hỏi thực nghiệm mở. Tách biệt ba lớp chứng cứ là nguyên tắc bắt buộc của dự án.
