# Bài toán 2 — Phá vỡ nút thắt kinh tế cơ số của tam phân bằng quang học?

**Mở trang:** https://xulytiengviet.github.io/thuyettamphan/bai-toan-2/

**Trang nghiên cứu của Long Ngo.** Mô phỏng chuyên biệt cho Thuyết Tam Phân, sử dụng các bất biến Base27–3 trit từ Bài toán 1.

## Nguồn nghiên cứu chính

Christopher Riner, *Wavelength-Division Ternary Computing II: The N-Radix Optical AI Accelerator*, 6 trang, PDF do người dùng cung cấp trong phiên nghiên cứu. Dự án chỉ trích xuất mô tả/giả định, không sao chép toàn bộ bài báo PDF vào GitHub.

Bài báo nêu:
- Trang 1: **giả định** phần cứng tam phân dùng transistor có chi phí khoảng 40× so với nhị phân; lập luận chi phí chọn bước sóng có thể gần như không đổi theo bậc cơ số.
- Trang 1, bảng I: ánh xạ −1 → 1550 nm, 0 → 1310 nm, +1 → 1064 nm.
- Trang 3, mục V: giả định 9× với phép cộng, kết hợp tỷ lệ add/multiply 50/50 cho dự phóng 1,8× theo Amdahl.
- Trang 3–4: các số 148 PFLOPS/chip, 400 W, so sánh Frontier/B200 là **ước tính hệ thống** chứ chưa phải phép đo trên chip thương mại.
- Trang 4–5: mô tả mô phỏng Meep FDTD clock skew ~39,3 fs cho 27×27 và WDM channel isolation; không có bản tái lập FDTD từ repo Thuyết Tam Phân.
- Trang 5, *Ongoing Work*: weight storage/streaming integration vẫn đang tiếp tục kiểm chứng, chưa thành một thiết bị huấn luyện LLM được chứng minh.

## Điểm cần sửa khi dùng phát biểu phổ biến “1 transistor/bit so với 40 transistor/trit”

Một transistor làm công tắc **không đồng nghĩa** một bit ổn định luôn dùng một transistor: inverter CMOS cần 2 transistor, ô SRAM 6T thường gồm 6 transistor, flip-flop phức tạp hơn. Các thiết kế ternary gate/memory khác nhau cũng cần chi phí khác nhau. Không có **hằng số vật lý 40×** cho mọi công nghệ, mọi chức năng.

Tương tự, bộ phân kênh WDM không có chi phí **tổng thể độc lập hoàn toàn** với số kênh: tăng số bước sóng thường tăng yêu cầu nguồn laser, bộ điều chế/thu, băng thông, spacing, quang sai và crosstalk. Một cấu kiện chọn bước sóng có thể tái sử dụng chung nhưng không chứng minh hệ thống miễn phí khi tăng bậc cơ số.

## Mã nguồn mô hình

- `core.js` — hàm độc lập, có thể test với Node.js, không dựa vào DOM:
  - `encodeSymbol("T")`: chữ số Base27 ↔ ba trit cân bằng ↔ ba bước sóng theo ánh xạ của bài báo.
  - `compareImplementationCosts(...)`: đối chiếu chi phí *quy ước* để mã hóa đủ 27 trạng thái (5 bit so với 3 trit).
  - `spectralConfusion(...)`: bộ phân loại 3 tâm bước sóng dưới giả định nhiễu phổ Gaussian độc lập và ngưỡng giữa tâm.
  - `amdahl(...)`: định luật Amdahl cho phần công việc được tăng tốc, mở rộng WDM theo giả định song song lý tưởng.
  - `evaluateScenario(...)`: xuất báo cáo mô hình.
- `app.js` — UI, biểu đồ thanh tự động, ma trận nhầm lẫn, export JSON.
- `style.css` — giao diện sáng responsive.
- `index.html` — trang HTML GitHub Pages độc lập.
- `../tests/problem2.test.mjs` — kiểm thử 27 trạng thái, xác suất, giới hạn Amdahl, cost model.

## Các công thức được sử dụng

Với 27 ký hiệu Base27:
```text
d = 13 + 9*t2 + 3*t1 + t0, trit ∈ {-1,0,+1}
C_binary = 5 * C_bit
C_electronic_ternary = 3 * C_bit * ratio
C_optical_ternary = shared_cost + 3 * per_trit_optical_cost
```

Tỷ số `ratio=40` được dùng **để mô phỏng lập luận của bài báo**. Nếu dùng ví dụ ô nhớ 6T/bit và 40T/trit, tỷ lệ mỗi trit/bit là 40/6 ≈6,67× và chi phí cho cả mã 27 ký hiệu là `5*6=30T` vs `3*40=120T`, không phải 40×.

```text
P(measure wavelength | sent trit) ∼ Normal(λ_trit + drift_nm, sigma_nm²)
decision boundaries: 1187 nm, 1430 nm
Amdahl: S = 1 / ((1 - f) + f / S_add)
f=0.5; S_add=9 => S=1.8
```

Các công thức chỉ là mô hình chẩn đoán. Không có xác minh FDTD, output SFG thực, chi phí chế tạo, laser energy, tiến trình đóng gói chip hay năng lượng/token của LLM.

## Đánh giá độc lập

Nguồn nền để phân biệt đóng góp của PDF và các bằng chứng về công nghệ:

- [Tổng quan thiết kế mạch logic tam phân, Results in Engineering, 2024](https://doi.org/10.1016/j.rineng.2024.102761).
- [ITU-T G Suppl. 39 (03/2025): Optical system design and engineering considerations](https://www.itu.int/epublications/publication/itu-t-g-suppl-39-2025-03-optical-system-design-and-engineering-considerations/en).
- [Pirmoradi et al., Nature Communications (2025), nguồn WDM nhiều bước sóng](https://www.nature.com/articles/s41467-025-61288-x).
- [Scalability of Silicon Photonic WDM Receivers for Low-Power Optical I/O, JLT (2025)](https://opg.optica.org/jlt/abstract.cfm?uri=jlt-43-16-7736).
- [Riner, Wavelength-Division Ternary Logic, Zenodo 2026](https://doi.org/10.5281/zenodo.18437600).
- [Mã công khai tác giả tham chiếu; kho GitHub đã archive](https://github.com/buckbuilds/-wavelength-ternary-optical-computer) — được dẫn nguồn, không sao chép mã từ repo này.

## Kết nối 2 bài toán

**Bài toán 1:** song ánh Base27 ↔ 3 trit và tính đúng đắn của codec CVNSS/sidecar.  
**Bài toán 2:** khảo sát điều kiện vật lý, chi phí thiết kế và chuyển đổi điện–quang để đưa ba trit lên kênh truyền hoặc nhân tính toán.  

Hai phép chứng minh **độc lập về phạm vi**. Không được suy ra hiệu quả LLM/robot hay chip quang học từ định lý mã hóa Base27.

## Chạy local

```bash
python -m http.server 8000
# mở http://localhost:8000/bai-toan-2/
npm test
```

**Giấy phép phần dự án tự phát triển:** Non-Commercial License trong `../LICENSE-NONCOMMERCIAL.md`. Các tài liệu và mã upstream thuộc quyền và giấy phép gốc của chủ sở hữu.
