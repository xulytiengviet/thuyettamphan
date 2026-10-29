# Chứng minh bài toán 1 — đặc tả nghiên cứu và các giới hạn

## Phạm vi tuyên bố

Nghiên cứu CVNSS4.0–Base27–Ternary AI cần phân biệt:

1. Định lý toán học: 27 ký hiệu Base27 có biểu diễn bằng đúng 3 trit cân bằng.
2. Lossless của **gói mở rộng** CQN → CVNSS4.0 + sidecar → CQN.
3. Hiệu năng tokenizer và AI tam phân so với BPE, byte-level, SentencePiece (chưa có số liệu đối chứng).
4. Phần cứng tam phân ba mức điện áp (mô phỏng lý thuyết, không phải chip đã chế tạo).

Không được suy ra (3) hoặc (4) chỉ từ (1) hay (2).

## I. Định lý song ánh, 27 = 3^3

Đặt Sigma = {SPACE,A,...,Z}, d(SPACE)=0, d(A)=1,...,d(Z)=26.

Tam phân cân bằng T={-1,0,1}. Ta định nghĩa

```
  d - 13 = 9 t2 + 3 t1 + t0,  (t2,t1,t0) ∈ T^3.
```

Các tổng thuộc [-13,13]; và nếu hai bộ ba cho cùng một số, thì hiệu của chúng

```
9 Δt2 + 3 Δt1 + Δt0 = 0
```

với mỗi Δti ∈ {-2,-1,0,1,2}. Lấy modulo 3 cho thấy Δt0 phải bằng 0. Chia tiếp cho 3, lặp lại suy ra Δt1=0 rồi Δt2=0. Vậy biểu diễn là duy nhất.

Mặt khác, miền có 27 phần tử, ảnh của ánh xạ có 27 phần tử và nằm trong đúng 27 giá trị d. Suy ra song ánh. Cách chứng minh khác là chạy hữu hạn toàn bộ 27 trạng thái (mã nguồn `mappingProof`).

Số ký hiệu cố định tối thiểu: ceil(log_3 27)=3 trit; ceil(log_2 27)=5 bit. Chú ý: 3 trit không tương đương 3 bit và không chứng minh năng lượng thấp hơn; log2(27)≈4.755 bit thông tin tối đa.

## II. CVNSS thuần có nhập nhằng: phản ví dụ

Bộ chuyển đổi v5.0.0-audit-safe chính thức trong `vendor/cvnss4-v5.js` tự khai báo đồ thị ứng viên, có `audit()` và `selfTest()`. Quan sát `audit()` cho 56 nhóm nhập nhằng với quy tắc canonical.

Các cặp ví dụ trong converter:

```
  C("iên") = "ily" = C("yên")
  C("oà") = "oal" = C("òa")
```

Do đó C không đơn ánh trên tập chứa những cặp này. Không tồn tại D:C(X)→X thỏa D(C(x))=x với mọi x trong tập đó. Self-test 23/23 chỉ xác nhận các điều kiện được nêu trong bộ kiểm thử nội bộ.

## III. Gói lossless mở rộng

Định nghĩa văn bản x là chuỗi Unicode scalar, CVSS c=C(x), canonical y=D_C(c), sidecar S(x,y) là một danh sách thay thế có vị trí, xóa, chèn dùng tọa độ theo codepoint (không phải UTF-16 code unit). Gói E(x) chứa:

```
{
  format: "T27-LP1",
  converterVersion,
  transport: { mode, digits },
  patches: [{at, remove, insert}],
  utf8Length,
  utf8Sha256
}
```

Transport là một trong hai chế độ:

- `direct27`: mọi ký hiệu CVSS phải nằm trong [a-z ] (chữ thường hoặc khoảng trắng); một ký hiệu = một chữ số Base27.
- `utf8-pair27`: cho mọi byte UTF-8 b∈[0,255], lưu hai chữ số [floor(b/27), b%27]. Hai chữ số luôn khôi phục byte b do floor(b/27)*27 + (b%27)=b; từ đó giải mã UTF-8 chính xác nếu byte hợp lệ.

Mỗi chữ số Base27 ánh xạ sang ba trit, kiểm chứng độc lập.

Trên chuỗi đã giải mã vận chuyển, áp dụng canonical D_C để tạo y; áp dụng patches đảo ngược theo thứ tự vị trí rồi so SHA-256, độ dài UTF-8. Do thuật toán xây patches được định nghĩa sao cho applyPatches(y, S(x,y))=x, ta có khôi phục chính xác x trong miền mà converter và định dạng patch hỗ trợ. Mọi byte của đầu vào được giữ nguyên khi chuyển về UTF-8, kể cả khác biệt NFC/NFD nếu sidecar ghi đúng.

Đây là **lossless của cặp (CVSS,sidecar)**, không phải CVSS đơn thuần. Để trở thành bằng chứng tổng quát vững chắc, cần đặc tả hóa hết ngoại lệ Unicode, giới hạn đầu vào, định dạng nhị phân có phân giải, thử nghiệm kiểm toán và/hoặc formal verification cho bộ pack/unpack. Bản hiện tại là prototype JS có property tests, không phải chương trình chứng minh hình thức.

SHA-256 là dấu kiểm toàn vẹn; thiếu chữ ký số thì không chứng minh danh tính người gửi. Bản sidecar không được khẳng định có kích thước tối thiểu; thuật toán LCS trong demo dùng bảng động đến 450 Unicode scalars mỗi phía, chuỗi dài hơn chuyển sang một bản vá prefix/suffix. Trường hợp này đúng nhưng có thể lớn hơn UTF-8 gốc.

## IV. RUL - phạm vi tái sử dụng thật

Upstream: https://github.com/xulytiengviet/rul (Rul v0.1; package tại https://github.com/rul-lang/rul được nêu trong metadata). RUL là SSA-DAG nhị phân 128-bit và verifier $O(N)$ cho hình dạng DAG, bounds, capabilities, ownership. Các đối tượng này kiểm chứng **an toàn đồ thị**, không kiểm chứng Unicode hay đơn ánh CVNSS.

`rul-bridge/` phụ thuộc RUL git pin `796d465773664f09bb415f35465d9df6bb4435d9`, dùng API `SymbolicGraphBuilder`, `verify_program`, `to_rl_bytes/from_rl_bytes`, và Tier0/Tier1/Tier2 để thực thi đồ thị tính `13 + 9*t2 + 3*t1 + t0 = d` trên bốn cột 32 phần tử gồm 27 chữ số 0..26 và 5 hàng đệm hợp lệ. Tổng bình phương sai số phải bằng 0, kiểm tra cả Tier 0, 1 và 2. Đây là phép đối chiếu số học RUL, **không phải** đồ thị chứng minh tam phân/Unicode đầy đủ.

Website mô phỏng các tier bằng JavaScript và ghi rõ đây là *mô phỏng*, trong khi GitHub Actions chạy crate Rust thật. Các số liệu GB/s trên README RUL đo các pipeline số học không được suy rộng sang huấn luyện LLM.

## V. Nút thắt tokenizer tiếng Việt

Lưu ý kích thước bảng từ vựng V và chiều dài chuỗi L độc lập. Một biểu thức biểu diễn gần đúng (phụ thuộc kiến trúc):

```
C ≈ a L d² + b L² d + c L V d
```

Giảm V từ 32K xuống 27 giảm kích thước embedding về tham số, nhưng nếu L tăng 3 lần thì thành phần attention toàn cục O(L²) có thể tăng 9 lần. Không được coi các tỷ lệ này là FLOPs đo được trên model.

BPB nên tính trên văn bản gốc (gồm sidecar/escape để xác suất hợp lệ). Cần tokenizer thích ứng/patch, thiết kế các baseline M0–M6 và kiểm tra cùng FLOPs, chất lượng, độ dài ngữ cảnh, latency, điện năng.

Mô hình tham số tam phân như BitNet b1.58 sử dụng trọng số {-1,0,+1}, về logic **khác** ba trit diễn đạt một ký hiệu Base27.

## VI. Thử nghiệm bác bỏ giả thuyết

| Mã | Đầu vào/tokenizer | Lõi |
|---|---|---|
| M0 | CQN + BPE 32K | Transformer |
| M1 | CQN + SentencePiece 8K | Transformer |
| M2 | CQN byte-level | Transformer |
| M3 | CVNSS 27 ký hiệu | Transformer |
| M4 | CVNSS + BPE 8K | Transformer |
| M5 | CVNSS + 3-trit embedding + patch | Transformer |
| M6 | M5 | BitNet b1.58 style |

Kiểm tra cùng dữ liệu, seed, số bước, FLOPs; chất lượng cần so VMLU, nhiệm vụ tiếng Việt, tên riêng, dấu thanh, chuỗi ngoại lai, văn bản NFD/NFC, lệnh ngôn ngữ–hành động.

Đề xuất mục tiêu nghiên cứu trước khi đo: byte-for-byte roundtrip 100% trong miền công bố; sai khác chất lượng ≤1 điểm phần trăm; giảm ≥20% FLOPs và ≥20% joule/byte tiếng Việt. Đây là **ngưỡng mục tiêu**, không phải thành tựu.

## VII. Chip tam phân & robot

Mô hình điện áp trong website: t∈{-1,0,+1} ứng với -1V,0V,+1V, nhiễu ε~N(0,σ²), hai ngưỡng -0.5V và +0.5V. Phép tính hiển thị xác suất phân loại sai dưới các giả định này, không chứng minh vận hành một chip thực.

Để thương mại hóa bộ não robot tiếng Việt còn cần các tầng độc lập: sensor input, ASR, VLA/policy, an toàn motor, SLAM và môi trường thực, mạch IO, bộ nhớ, giao thức cùng thiết bị tính toán.

## VIII. Nguồn & công trạng

- Converter CVNSS4.0 v5.0.0-audit-safe: tệp người dùng cung cấp và giữ nguyên trong thư mục vendor.
- Base27-CVNSS4.0: https://base27-cvnss.github.io/
- RUL MIT OR Apache-2.0: https://github.com/xulytiengviet/rul
- BitNet b1.58: https://arxiv.org/abs/2402.17764
- ByT5: https://arxiv.org/abs/2105.13626
- Byte Latent Transformer: https://arxiv.org/abs/2412.09871

**Tuyên bố trung tâm:** Giá trị có thể chứng minh hiện tại là tạo ra bộ mã hóa tiếng Việt và lớp biểu diễn trit có chứng cứ kiểm chứng, không phải tuyên bố đã sở hữu chip tam phân hay LLM tam phân vượt mọi tokenizer hiện có.
