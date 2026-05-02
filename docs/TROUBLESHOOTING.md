# Troubleshooting & Đúc kết lỗi (Post-Mortem)

## 1. Lỗi: Failed to fetch users (Production/Vercel)

Lỗi này xuất hiện trong quá trình vận hành thực tế trên Vercel, dẫn đến việc không thể tải danh sách người dùng và làm hỏng các tính năng liên quan đến phân quyền (RBAC).

### Nguyên nhân (Cause)
*   **Mâu thuẫn biến môi trường (Env Mapping)**: Code ban đầu sử dụng linh hoạt giữa `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_URL`. Trên Vercel, nếu không được cấu hình đồng nhất, server-side code có thể bị thiếu credential để kết nối Admin SDK.
*   **Schema Database lệch pha**: Bảng `profiles` trên thực tế (Production) không có cột `email`, trong khi code backend cố gắng ghi hoặc đọc trường này, dẫn đến lỗi "Column does not exist" (PGRST204).
*   **Admin privileges**: Sử dụng key không đúng quyền dẫn đến RLS (Row Level Security) chặn truy cập khi query danh sách user ở cấp độ server.

### Cách tái hiện (Reproduction)
1.  Triển khai mã nguồn lên Vercel.
2.  Chỉ cấu hình `NEXT_PUBLIC_...` mà quên cấu hình `SUPABASE_SERVICE_ROLE_KEY` trong Environment Variables của Vercel.
3.  Truy cập tính năng cần lấy danh sách thành viên (như Add Task hoặc Admin Page).
4.  Tính năng sẽ trả về lỗi 500 "Failed to fetch users".

### Cách khắc phục (Resolution) - Đã thực hiện trong commit `fix: Improve Supabase auth and error handling`
1.  **Chuẩn hóa initialization**: Ép buộc sử dụng `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` cho các tác vụ server-side để đảm bảo quyền Admin.
2.  **Logic "Phòng thủ" (Defensive Logic)**: Bổ sung cơ chế `fallback` cho bảng `profiles`. Nếu insert/update có email bị lỗi, hệ thống sẽ tự động thử lại mà không có trường email.
3.  **Verbose Metadata**: Chuyển từ trả về lỗi chung chung sang trả về chi tiết (`details: error.message`) để admin có thể biết chính xác cột nào đang thiếu trên DB mà không cần xem log server.

### Cách phòng tránh (Prevention)
*   **Đồng bộ Schema**: Luôn kiểm tra file `docs/schema.sql` trước khi triển khai lên database mới.
*   **Kiểm tra Env bắt buộc**: Khai báo rõ ràng các biến server-side trong `.env.example` và thiết lập chúng như "Production Secret" trên Vercel.
*   **Sử dụng SupabaseAdmin đúng chỗ**: Tuyệt đối không dùng Service Role Key ở phía client (trình duyệt). Chỉ dùng trong `server.ts` hoặc các scripts chạy ngầm.

## 2. Lỗi: Email not confirmed (Đăng nhập thất bại)

### Nguyên nhân (Cause)
*   Tính năng xác nhận email đang được bật trong Supabase Project Settings. Người dùng đăng ký nhưng chưa click vào link xác thực trong Email.

### Cách tái hiện (Reproduction)
1.  Đăng ký một tài khoản mới bằng Email/Password.
2.  Cố gắng đăng nhập ngay lập tức bằng tài khoản vừa tạo.
3.  Thông báo lỗi "Email not confirmed" xuất hiện màu đỏ trên giao diện.

### Cách khắc phục (Resolution)
*   **Phía Admin/Dev**: 
    1. Vào Supabase Dashboard -> Authentication -> Providers -> Email -> Tắt "Confirm Email".
    2. **QUAN TRỌNG**: Phải nhấn nút **"Save changes"** ở góc dưới cùng bên phải và đợi thông báo thành công.
    3. **Với tài khoản đã tồn tại**: Nếu tài khoản đã lỡ đăng ký trước khi tắt confirm, bạn cần vào mục **Authentication -> Users**, tìm user đó, nhấn vào dấu 3 chấm và chọn **"Confirm User"** thủ công.
*   **Phía người dùng**: Nếu là tài khoản cũ, vẫn cần kiểm tra Email để xác nhận hoặc chờ Admin hỗ trợ xác nhận tay.

### Cách phòng tránh (Prevention)
*   Nếu dự án yêu cầu bảo mật cao, hãy thêm thông báo nhắc nhở "Vui lòng kiểm tra email để xác nhận" ngay sau khi người dùng nhấn Đăng ký.

## 3. Lỗi: Vercel Build Fail (Deployment)

### Nguyên nhân (Cause)
*   **Thiếu dependency**: Gói `tsx` nằm trong `devDependencies` nên không được cài đặt khi deploy production, khiến script chạy server bị lỗi.
*   **Sai lệch Alias**: Alias `@` trong `vite.config.ts` trỏ vào root thay vì `src`, gây lỗi import trong một số môi trường.
*   **Biến môi trường**: Truy cập `process.env` trực tiếp ở Client mà không có polyfill hoặc chưa khai báo biến `VITE_` tương ứng.

### Cách khắc phục (Resolution)
1.  **Chuyển tsx**: Chuyển `tsx` sang mục `dependencies` trong `package.json`.
2.  **Cập nhật Alias**: Đảm bảo `@` trỏ đúng vào `./src` trong cả `vite.config.ts` và `tsconfig.json`.
3.  **Hỗ trợ slugify**: Cài đặt và cấu hình `slugify` trong `utils.ts` để tránh lỗi missing module nếu có sử dụng.
4.  **Phòng thủ biến môi trường**: Sử dụng cú pháp `process.env.VAR || import.meta.env.VITE_VAR` để tương thích mọi môi trường build.

### Cách phòng tránh (Prevention)
*   Luôn chạy `npm run build` local trước khi push code.
*   Kiểm chứng tính đúng đắn của các alias trong các file Page và Component.

