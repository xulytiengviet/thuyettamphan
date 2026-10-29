# THUYẾT TAM PHÂN — Chứng minh bài toán 1

**CVNSS4.0 → Base27 → Ternary AI | Lossless Proof Laboratory**

Dự án mã nguồn công khai phục vụ nghiên cứu, kiểm chứng khoa học: (1) chứng minh song ánh 27 ký hiệu và 3 trit cân bằng; (2) kiểm toán CVNSS4.0 v5.0.0-audit-safe và 56 nhóm nhập nhằng; (3) chứng minh phép mã hóa *mở rộng* không mất mát bằng sidecar sửa sai và SHA-256; (4) mô phỏng RUL proof-carrying, phân biệt verifier thực và mô phỏng giao diện; (5) thiết kế benchmark so với tokenizer BPE, byte-level, patching, BitNet.

> **Giới hạn nghiên cứu**: Song ánh Base27/3-trit là định lý toán học. CVNSS4.0 đơn thuần không đơn ánh trên mọi văn bản. Round-trip của một gói chứa sidecar không chứng minh CVNSS4.0 tự thân lossless. Chưa có kết quả huấn luyện LLM hoặc đo điện năng chứng minh ưu thế so BPE.

## Chạy

Mở `index.html` bằng HTTP local (`python -m http.server 8000`) hoặc GitHub Pages, không cần backend.

```bash
npm test             # Song ánh, LP1/LP2, mini-BPE, leakage, evidence validator, giao diện
npm run evaluate     # Xuất reports/evaluation-v1.json với hash và kết quả P1–P3
npm run check        # Kiểm tra cú pháp và chạy toàn bộ test + báo cáo
```

Website GitHub Pages: https://xulytiengviet.github.io/thuyettamphan/ (xem [lịch sử triển khai](https://github.com/xulytiengviet/thuyettamphan/actions/workflows/pages.yml) để kiểm tra phiên bản đang xuất bản).

## Cấu trúc

- `index.html` — giao diện nghiên cứu tiếng Việt, mô phỏng và phòng thí nghiệm.
- `assets/style.css` — hệ giao diện sáng chuyên nghiệp, tương thích máy tính, máy tính bảng và điện thoại.
- `src/ternary.js` — Base27 / tam phân cân bằng / sidecar LP1 / kiểm thử Node và trình duyệt.
- `src/codec-v2.js` — LP2: escape cục bộ, chỉ chuyển các đoạn ký tự ngoại lệ sang cặp Base27 UTF-8.
- `src/evaluation.js` — bốn trụ đánh giá, mini byte-BPE có train/holdout, cổng kiểm định số liệu P4.
- `src/app.js` — trình điều khiển UI, mô phỏng sinh token và chứng cứ.
- `vendor/cvnss4-v5.js` — bộ chuyển đổi CVNSS4.0 5.0.0-audit-safe từ tác giả cung cấp, giữ đầy đủ nguyên gốc.
- `tests/proof.test.mjs`, `tests/evaluation.test.mjs`, `tests/ui.test.mjs` — kiểm thử có thể tái lập.
- `data/vietnamese_eval_v1.json` — 34 câu train, 18 câu holdout minh họa, không đại diện cho corpora tiếng Việt thật.
- `data/llm_evidence_template_v1.json` — biểu mẫu trống để tải lên kết quả LLM đã đo thật.
- `scripts/run_eval.mjs` — tạo báo cáo và hash SHA-256 của dữ liệu/các module.
- `docs/FOUR_PILLARS_PROTOCOL.md` và `docs/TERNARY_LLM_ARCHITECTURE.md` — giao thức đánh giá và kiến trúc mục tiêu.
- `rul-bridge/` — ví dụ kiểm chứng đồ thị bằng RUL mã nguồn thực, tách khỏi proof ngữ nghĩa codec.
- `.github/workflows/proof.yml` — CI chạy node tests và cầu nối Rust/RUL.

## Nguồn mã

- [RUL](https://github.com/xulytiengviet/rul) — dual-licensed MIT OR Apache-2.0. RUL hiện dùng binary SSA-DAG 128-bit, không phải máy tính tam phân vật lý.
- [Base27-CVNSS](https://base27-cvnss.github.io/) — quy ước khoảng trắng=0, A=1..Z=26.
- CVNSS4.0 converter v5.0.0-audit-safe (nguồn từ tệp người dùng cung cấp).

## Phân tầng chứng minh

| Lớp | Kết luận | Trạng thái |
|---|---|---|
| Base27 ↔ ba trit cân bằng | Song ánh 27 trạng thái | Chứng minh hữu hạn và test |
| Chữ Quốc Ngữ ↔ CVNSS4.0 | Có nhập nhằng | Phản ví dụ trực tiếp |
| Gói CVNSS4.0 + sidecar | Khôi phục chính xác byte gốc | Kiểm thử trên miền chọn; cần audit proof toàn miền |
| RUL verifier | Xác minh an toàn đồ thị RUL | Thực thi từ CI Rust |
| Tokenizer/LLM tam phân | Học và suy luận hiệu quả hơn | Chưa chứng minh; cần benchmark |

**Chú ý:** SHA-256 bảo đảm so khớp dữ liệu khi có giá trị băm tin cậy, không xác thực nguồn gốc nếu thiếu chữ ký số. Mã nguồn là nguyên mẫu nghiên cứu, không nên dùng làm hệ thống mật mã hoặc xác thực pháp lý.

## Triển khai trên GitHub Pages

Địa chỉ: **https://xulytiengviet.github.io/thuyettamphan/**

Repository có thể được xuất bản trực tiếp từ nhánh `main` theo tiến trình `pages build and deployment` của GitHub Pages. Xem [trạng thái triển khai thực tế](https://github.com/xulytiengviet/thuyettamphan/actions) trước khi xác nhận phiên bản mới đã hiển thị; các tệp HTML, CSS và JavaScript không cần build riêng.

Tệp `.github/workflows/pages.yml` là phương án triển khai thủ công bằng GitHub Actions khi chủ sở hữu cấu hình Source là `GitHub Actions`; không cần sử dụng workflow này nếu Pages đang cấu hình publish từ nhánh `main`.

## Giao diện cập nhật — Bài toán 1

Bản giao diện **nền sáng** do **Long Ngo phát triển**, có biểu đồ tương tác **nhị phân ↔ tam phân** cho số lượng ký hiệu từ 2 đến 81. Biểu đồ minh họa ba tiêu chí độc lập: độ dài mã cố định, không gian trạng thái khả dụng, và tỷ lệ sử dụng. Tại N = 27, kết quả là **5 bit → 32 mã (84,375%)** so với **3 trit → 27 mã (100%)**. Các giá trị này thuộc chứng minh biểu diễn logic; không phải dữ liệu đo năng lượng phần cứng hay hiệu suất LLM.

## Tác giả và giấy phép

**Long Ngo phát triển. Giấy phép phi thương mại · Non-Commercial License.**

Các phần mã nguồn, giao diện và tài liệu **do dự án tự sở hữu** được phân phối theo [LICENSE-NONCOMMERCIAL.md](./LICENSE-NONCOMMERCIAL.md); việc sử dụng thương mại đòi hỏi giấy phép riêng bằng văn bản. Đây là mã nguồn được công bố với hạn chế phi thương mại, **không phải giấy phép nguồn mở theo định nghĩa OSI**.

Các thành phần có nguồn gốc bên thứ ba **không bị đổi giấy phép**: thư viện RUL vẫn theo **MIT OR Apache-2.0**; bộ chuyển đổi CVNSS4.0 trong `vendor/` vẫn cần tuân thủ quyền và điều khoản nguyên gốc tương ứng. Tài liệu giấy phép không chuyển quyền sở hữu các thành phần đó cho dự án.

## Phòng đánh giá 4 trụ cột (v1)

Bấm **4 phép đánh giá** trên website. P1 kiểm hết 27 ký hiệu; P2 chạy round-trip LP1/LP2 và tính byte của sidecar; P3 huấn luyện **hai mini-BPE byte-level** trên 34 câu train rồi đo trên 18 câu holdout, không có rò rỉ train/holdout; P4 chỉ nhận hồ sơ đo thực tế, tối thiểu 3 seed, cùng hardware/dataset/protocol và ngân sách gần tương đương.

Thử nghiệm chẩn đoán trong CI (không phải kết quả LLM) đã ghi nhận trên tập holdout v1:
- 18/18 trường hợp có thể khôi phục qua gói lossless có sidecar;
- luồng Base27 legacy 2.296 chữ số, LP2 escape cục bộ 1.273 chữ số;
- văn bản gốc 1.418 byte; riêng tổng các gói LP2 dưới dạng JSON **11.166 byte**, lớn hơn dữ liệu gốc đáng kể;
- mini-BPE Unicode trong báo cáo: 784 token trên tập holdout (không đại diện cho tokenizer BPE32K).

Đây là **số liệu chẩn đoán của corpus cực nhỏ**. Chưa có kết quả đo việc huấn luyện mô hình, inference FLOPs, chất lượng tiếng Việt hoặc joule trên phần cứng. Xem [giao thức bốn trụ](docs/FOUR_PILLARS_PROTOCOL.md), [kiến trúc VVTLM](docs/TERNARY_LLM_ARCHITECTURE.md) và [CI / artifact kiểm chứng](https://github.com/xulytiengviet/thuyettamphan/actions/workflows/proof.yml) trước khi trích dẫn.


## Bài toán 2 — Nút thắt 40× và tam phân quang học

**Trang tương tác:** [Bài toán 2 — N-Radix, WDM và giới hạn phần cứng](https://xulytiengviet.github.io/thuyettamphan/bai-toan-2/).

Thư mục mới [`bai-toan-2/`](bai-toan-2/) gồm trang độc lập, CSS responsive, bộ mô phỏng và tài liệu nghiên cứu đối chiếu PDF của Christopher Riner, *Wavelength-Division Ternary Computing II: The N-Radix Optical AI Accelerator*.

- Tái sử dụng mô hình ký hiệu Base27 ↔ 3 trit từ [Bài toán 1](https://xulytiengviet.github.io/thuyettamphan/).
- Thử nhiều giả định chi phí transistor, bao gồm **kịch bản 40×** trong bài báo và ví dụ **SRAM 6T/bit so với 40T/trit**. Không khẳng định một bit ổn định chỉ cần 1 transistor.
- Mã trit bằng ba bước sóng hồng ngoại **1550 / 1310 / 1064 nm**.
- Thay nhiễu Gaussian σ và lệch bước sóng Δλ để xem ma trận nhầm lẫn; chỉ là mô hình phân loại, **không phải Meep FDTD**.
- Kịch bản Amdahl: f=50% công việc được tăng tốc 9× cho dự phóng 1,8×, và mô phỏng giới hạn WDM với giả định tận dụng kênh.
- Xuất JSON của các giả định đầu vào, kết quả và giới hạn mô hình; kiểm thử tự động qua `tests/problem2.test.mjs`.

**Đánh giá khoa học:** lợi ích tính toán quang học là hướng nghiên cứu có cơ sở, nhưng con số 40× không phải định luật phổ quát; chi phí quang học tổng cộng phụ thuộc laser, điều chế, mux/demux, detector, ADC/DAC, nhiệt và nhiễu xuyên kênh. Các con số 148 PFLOPS/400W là dự phóng của bài báo, chưa phải benchmark xác minh độc lập hoặc kết quả chip của phòng thí nghiệm.

Xem [`bai-toan-2/README.md`](bai-toan-2/README.md) để đọc nguồn, phương trình và giới hạn nghiên cứu.
