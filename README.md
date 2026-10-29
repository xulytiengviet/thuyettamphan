# THUYẾT TAM PHÂN — Chứng minh bài toán 1

**CVNSS4.0 → Base27 → Ternary AI | Lossless Proof Laboratory**

Dự án kiểm chứng khoa học bằng mã nguồn mở: (1) chứng minh song ánh 27 ký hiệu và 3 trit cân bằng; (2) kiểm toán CVNSS4.0 v5.0.0-audit-safe và 56 nhóm nhập nhằng; (3) chứng minh phép mã hóa *mở rộng* không mất mát bằng sidecar sửa sai và SHA-256; (4) mô phỏng RUL proof-carrying, phân biệt verifier thực và mô phỏng giao diện; (5) thiết kế benchmark so với tokenizer BPE, byte-level, patching, BitNet.

> **Giới hạn nghiên cứu**: Song ánh Base27/3-trit là định lý toán học. CVNSS4.0 đơn thuần không đơn ánh trên mọi văn bản. Round-trip của một gói chứa sidecar không chứng minh CVNSS4.0 tự thân lossless. Chưa có kết quả huấn luyện LLM hoặc đo điện năng chứng minh ưu thế so BPE.

## Chạy

Mở `index.html` bằng HTTP local (`python -m http.server 8000`) hoặc GitHub Pages, không cần backend.

```bash
npm test  # Chạy test Node.js: ánh xạ, phản ví dụ, sidecar, fuzz round-trip
```

Trang GitHub Pages dự kiến: https://xulytiengviet.github.io/thuyettamphan/

## Cấu trúc

- `index.html` — giao diện nghiên cứu tiếng Việt, mô phỏng và phòng thí nghiệm.
- `assets/style.css` — hệ thiết kế responsive dark neon.
- `src/ternary.js` — Base27 / tam phân cân bằng / sidecar / kiểm thử có thể nhập bằng Node và trình duyệt.
- `src/app.js` — trình điều khiển UI, mô phỏng sinh token và chứng cứ.
- `vendor/cvnss4-v5.js` — bộ chuyển đổi CVNSS4.0 5.0.0-audit-safe từ tác giả cung cấp, giữ đầy đủ nguyên gốc.
- `tests/proof.test.mjs` — các phép thử có thể tái lập.
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

## Bật GitHub Pages cho repository lần đầu

Trang web đã có `index.html` trong root, nhưng GitHub Pages của repository mới cần được chủ sở hữu bật trong UI. GitHub Actions hiện không được phép tự tạo Pages site: API trả `Resource not accessible by integration`.

1. Vào [Settings → Pages](https://github.com/xulytiengviet/thuyettamphan/settings/pages).
2. Trong **Build and deployment**, chọn **Source: GitHub Actions**.
3. Vào [Actions → Deploy Research Lab to GitHub Pages](https://github.com/xulytiengviet/thuyettamphan/actions/workflows/pages.yml) và nhấn **Run workflow**.
4. Sau khi deployment SUCCESS, mở https://xulytiengviet.github.io/thuyettamphan/.

Workflow Pages để ở chế độ chạy thủ công nhằm tránh các lần thất bại lặp lại trước khi Pages được bật; workflow kiểm chứng bằng Node/RUL vẫn tự chạy trên push.
