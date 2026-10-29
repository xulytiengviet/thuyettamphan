# Kiến trúc nghiên cứu Vietnamese Verified Ternary Language Model (VVTLM)

**Trạng thái:** kiến trúc đề xuất, chưa huấn luyện một LLM trong repository. **Phát triển:** Long Ngo.

## 1. Tách các lớp cấu trúc

Chữ Quốc Ngữ Unicode → kiểm tra UTF-8 và tính hợp lệ Unicode scalar → CVNSS4.0 v5 + registry nhập nhằng → luồng Base27 (27 ký hiệu) ↔ 3 trit cân bằng → tokenizer phân cấp/patching → Transformer hoặc mô hình BitNet-style với trọng số tam phân → đầu ra CVNSS và sidecar → bộ giải mã xác định để khôi phục CQN.

**Hai khái niệm độc lập:** đầu vào 3 trit cho một ký hiệu Base27 không buộc trọng số LLM cũng là tam phân; trọng số BitNet thuộc {-1,0,+1} không chứng minh bộ tokenizer tiếng Việt có lợi hơn BPE.

RUL được dùng để kiểm chứng bất biến đồ thị và phép tái dựng 27 ký hiệu ở một bộ kiểm thử Rust thực, không phải một compiler huấn luyện Transformer và không chứng minh tính đúng ngữ nghĩa của LLM.

## 2. Luồng dữ liệu lossless

Giao thức T27-LP2 trong src/codec-v2.js giữ những đoạn [a-z và dấu cách] dưới dạng chữ số Base27 trực tiếp, chỉ mã hóa cụm ngoại lệ thành từng cặp chữ số cho mỗi byte UTF-8. Bản giải mã canonical của CVNSS được bổ sung các bản vá Unicode thưa (sidecar) và kiểm SHA-256 của byte gốc.

Chuỗi có surrogate đơn lẻ bị loại để giới hạn miền về Unicode scalar hợp lệ. Hệ thống mới là prototype thử nghiệm trên corpus nhỏ, không phải formal proof toàn bộ miền dữ liệu. Khi huấn luyện LLM, để tuyên bố sinh văn bản có thể khôi phục chính xác, mô hình cũng phải dự đoán sidecar/escape hoặc có cơ chế xác định khác để phục hồi; không thể bỏ phần mất thông tin.

## 3. Ba đối chứng embedding

- E0: Lookup 27 × d tham số, một embedding độc lập cho mỗi ký hiệu.
- E1: Embedding có cấu trúc E2[t2] + E1[t1] + E0[t0], tổng 9 × d phần tử tra cứu; giảm bậc tự do cũng có thể giảm chất lượng, cần ablation.
- E2: Adaptive patches trên đoạn CVNSS, âm tiết hoặc entropy; có offset gốc và escape. Không để mỗi trit trở thành một bước Transformer riêng nếu điều đó tăng chi phí attention.

## 4. Lõi mạng tam phân

Thử ternary-weight Linear (quantization aware training với STE và scale theo nhóm) trong attention/FFN, so với cùng kiến trúc full precision. Không thay đổi đồng thời tokenizer, embedding, trọng số và ngân sách rồi kết luận tác dụng của một biến. Trọng số, activation, embedding, softmax và các kernel trên thiết bị biên cần đo riêng.

Tham chiếu upstream: https://github.com/microsoft/BitNet . Số liệu benchmark BitNet upstream chỉ chứng minh hiệu quả trên cấu hình thử nghiệm của họ, không được gán cho CVNSS.

## 5. Ma trận thí nghiệm

| Đối chứng | Biến thay đổi | Cố định |
|---|---|---|
| M0 ↔ M3 | Unicode BPE ↔ CVNSS ký hiệu | cùng dữ liệu, kiến trúc và train FLOPs |
| M3 ↔ M4 | char-level ↔ CVNSS-BPE | converter, thiết lập học |
| M3 ↔ M5 | lookup ↔ structured embedding + patch | lõi full precision, cùng budget |
| M5 ↔ M6 | full precision ↔ ternary-weight core | tokenizer, patch, dữ liệu |
| LP1 ↔ LP2 | escape toàn câu ↔ escape cục bộ | Unicode đầu vào và converter |

## 6. Các đơn vị đo công bằng

Tokenizer khác nhau phải so trên byte UTF-8 nguyên gốc: latency_ms / byte đầu ra; joule / byte; inference FLOPs / byte; peak RAM; chất lượng tác vụ tiếng Việt. BPB chỉ so được khi xác suất đã chuẩn hóa về văn bản nguyên bản, bao gồm cả sidecar/escape và phép biến đổi phải khả nghịch.

Yêu cầu ít nhất 3 seed mỗi arm, cùng hash dữ liệu và phiên bản quy trình, phần cứng giống nhau, lệch ngân sách training FLOPs và tham số tối đa 5%. Mục tiêu chất lượng sụt không quá 1 điểm phần trăm, tiết kiệm 20% FLOPs suy luận và 20% J/byte — đây là mục tiêu chưa được đo trong dự án.

## 7. Các bước tiếp theo

1. Mở rộng corpus thực có giấy phép, tránh dữ liệu cá nhân, chuẩn hóa split và audit.
2. Huấn luyện tokenizer BPE32K, SentencePiece, CVNSS-BPE, adaptive patches trên cùng dữ liệu train; đo token trên heldout.
3. Bổ sung cả sidecar vào bài toán ngôn ngữ, tính likelihood của mọi thành phần để so BPB công bằng.
4. Huấn luyện M0–M6 có kiểm soát FLOPs/params, nhiều seed; đo latency, RAM, điện năng trên cùng thiết bị.
5. Xuất báo cáo và minh chứng model/tokenizer/hardware commit; công bố cả trường hợp thất bại.

## Tham chiếu

- RUL: https://github.com/xulytiengviet/rul
- Meta BLT, ACL 2025: https://aclanthology.org/2025.acl-long.453/
- Microsoft BitNet: https://github.com/microsoft/BitNet
- Giao thức đánh giá bốn trụ: FOUR_PILLARS_PROTOCOL.md

**Kết luận:** P1 là định lý đã được kiểm chứng. P2/P3 là kiểm thử chẩn đoán. P4 chưa có số liệu từ LLM thật; mọi kết luận vượt BPE chỉ là giả thuyết nghiên cứu.
