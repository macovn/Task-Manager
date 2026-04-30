# Troubleshooting & Đúc kết lỗi

## 1. Lỗi: Failed to fetch users

### Nguyên nhân (Cause)
*   **Sai biến môi trường**: Trước đó, `supabaseAdmin` trong `server.ts` sử dụng `NEXT_PUBLIC_SUPABASE_URL`. Trong môi trường Node.js server, nên ưu tiên dùng `SUPABASE_URL`.
*   **Lỗi Schema DB**: Bảng `profiles` trong cơ sở dữ liệu có thể không có cột `email` (do schema cũ hoặc quá trình migrate thiếu sót), nhưng code backend cố gắng insert/update trường này, dẫn đến lỗi database.
*   **Log lỗi thiếu thông tin**: API chỉ trả về chuỗi chung chung "Failed to fetch users" mà không có chi tiết lỗi từ database, gây khó khăn cho việc sửa lỗi.

### Cách tái hiện (Reproduction)
1.  Truy cập vào trang quản lý người dùng (Admin) hoặc mở Modal thêm nhiệm vụ.
2.  Backend thực hiện query `supabase.from('profiles').select('*')`.
3.  Nếu server không nạp đủ biến môi trường Service Role Key hoặc bảng `profiles` bị lỗi schema, API sẽ trả về status 500.

### Cách khắc phục (Resolution)
1.  **Cập nhật initialization**: Chuyển sang sử dụng `SUPABASE_URL` và nạp biến môi trường một cách chắc chắn hơn.
2.  **Defensive Coding (Lập trình phòng thủ)**: Bổ sung logic kiểm tra lỗi cụ thể. Nếu lỗi do thiếu cột `email`, hệ thống sẽ tự động thực hiện lại query mà không có trường đó (`fallback`).
3.  **Verbose Logging**: Cập nhật route `/api/users` và các route admin để log chi tiết lỗi (`error.message`) và trả về `details` trong response để dễ dàng debug.

### Cách phòng tránh (Prevention)
*   Luôn sử dụng `SUPABASE_SERVICE_ROLE_KEY` cho các tác vụ server-side cần quyền admin.
*   Khi tương tác với schema database, hãy viết code có khả năng thích ứng (kiểm tra lỗi thiếu cột hoặc missing field) để tăng tính ổn định của ứng dụng.
*   Đảm bảo các biến môi trường được khai báo đầy đủ trong `.env.example`.
