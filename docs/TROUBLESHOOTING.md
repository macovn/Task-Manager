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

## 4. Lỗi: Bảng nhiệm vụ trống trên Vercel (Empty Dashboard)

Dù đã đăng nhập thành công nhưng các chỉ số đều bằng 0 và không thấy nhiệm vụ nào.

### Nguyên nhân (Cause)
*   **Môi trường Database khác biệt**: Supabase Local và Supabase Production (Vercel) là hai database độc lập. Dữ liệu tạo ở local sẽ không xuất hiện trên Vercel.
*   **Bộ lọc RBAC (Role-Based Access Control)**: Route `/api/tasks` chỉ trả về nhiệm vụ do chính bạn tạo hoặc được giao cho bạn (`user_id` hoặc `assignee_id`). Nếu bạn đăng nhập bằng tài khoản mới chưa có task, bảng sẽ trống.
*   **RLS (Row Level Security)**: Nếu bạn query trực tiếp từ client (không qua API backend) và chưa cấu hình Policy cho table `tasks`, Supabase sẽ trả về mảng trống để bảo mật.

### Cách tái hiện (Reproduction)
1. Đăng nhập vào bản deploy trên Vercel bằng một tài khoản mới.
2. Truy cập Dashboard hoặc Kanban.
3. Kết quả: "0 items", "Trống".

### Cách khắc phục (Resolution)
1.  **Kiểm tra tính năng "Nhiệm vụ mới"**: Thử nhấn nút "+ Nhiệm vụ mới" và tạo một task. Nếu task xuất hiện, hệ thống vẫn hoạt động bình thường, chỉ là database chưa có dữ liệu cũ.
2.  **Cấu hình Policy (Nếu dùng client-side query)**: Vào Supabase Dashboard -> Database -> Policies -> Enable RLS và Add Policy cho phép người dùng xem task của chính họ.
3.  **Kiểm tra API Log**: Nếu tạo task bị lỗi, hãy xem log Vercel để kiểm tra lỗi kết nối database.

### Cách phòng tránh (Prevention)
*   Thiết lập một vài "Task mẫu" (Seed data) cho môi trường production.
*   Đảm bảo `SUPABASE_SERVICE_ROLE_KEY` được cấu hình đúng trên Vercel để Backend có thể bypass RLS khi cần thiết.

## 5. Lỗi: Mất hết Role (Missing Roles / RBAC Failure)

Người dùng đăng nhập nhưng không thấy các quyền Admin hoặc các tính năng bị hạn chế so với bản local.

### Nguyên nhân (Cause)
*   **Chưa chạy SQL Trigger**: Trong Supabase, việc tạo User trong bảng `auth.users` không tự động tạo hàng trong `public.profiles` trừ khi bạn thiết lập **SQL Trigger**.
*   **Role mặc định**: Trigger mặc định đang để role là `nhan_vien`.
*   **Quên config RLS cho Profiles**: Nếu bảng `profiles` có RLS nhưng chưa có Policy cho phép xem, app sẽ nhận về mảng trống hoặc báo lỗi không có quyền.

### [ EMERGENCY FIX – ROLE LOST ] - Các bước xử lý nhanh
Nếu hệ thống bị lỗi Role, hãy chạy các câu lệnh SQL sau trong **Supabase SQL Editor**:

1. **Kiểm tra dữ liệu hiện tại**:
   ```sql
   SELECT id, role, full_name FROM profiles;
   ```

2. **Sửa lỗi RLS (QUAN TRỌNG NHẤT)** - Cho phép Client đọc được thông tin Role:
   ```sql
   CREATE POLICY "Allow read profiles"
   ON profiles
   FOR SELECT
   USING (true);
   ```

3. **Sửa lỗi Role bị NULL**:
   ```sql
   UPDATE profiles
   SET role = 'nhan_vien'
   WHERE role IS NULL;
   ```

4. **Cấp quyền Admin cho tài khoản điều hành**:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id IN (
     SELECT id FROM auth.users WHERE email = 'macovn@gmail.com'
   );
   ```

### Cách tái hiện (Reproduction)
1.  Đăng ký tài khoản mới trên Vercel.
2.  Sau khi đăng nhập, vào trang Admin hoặc Dashboard.
3.  Các thông báo "Bạn không có quyền" hoặc giao diện bị trống role xuất hiện.

### Cách khắc phục (Resolution)
1.  **Chạy lại Schema**: Copy nội dung trong `docs/schema.sql` (đặc biệt là phần `CREATE TRIGGER on_auth_user_created`) và chạy trong Supabase SQL Editor.
2.  **Khởi tạo lại User**: Nếu bảng `profiles` đang trống cho user cũ, bạn có thể xóa user đó trong mục Authentication và đăng ký lại (sau khi đã chạy Trigger SQL).

## 7. Lỗi: Khôi phục nhiệm vụ đã khởi tạo (Restoring Seed Tasks)

Nếu hệ thống mới triển khai và bạn muốn có dữ liệu mẫu để kiểm tra hoặc khôi phục trạng thái ban đầu.

### Cách thực hiện (Execution)
1.  Truy cập vào tệp `/docs/seed.sql`.
2.  Copy toàn bộ nội dung trong tệp đó.
3.  Vào **Supabase SQL Editor** -> Tạo query mới -> Paste và **Run**.
4.  Câu lệnh này sẽ tự động tìm User `macovn@gmail.com` và gán các task mẫu cho tài khoản này.

### Lưu ý (Notes)
*   Đảm bảo bạn đã đăng ký tài khoản `macovn@gmail.com` trước khi chạy script.
*   Nếu muốn gán cho user khác, hãy sửa email trong script script.
*   Dữ liệu sau khi chạy sẽ xuất hiện ngay lập tức trên Dashboard/Kanban.


Khi hệ thống gặp nhiều lỗi vụn vặt về query, role hoặc hiển thị, cần thực hiện quy trình "Ổn định hóa".

### Các bước đã thực hiện (Executed Acts)
1.  **Gộp Join Assignee**: Chuyển việc join thông tin người thực hiện (`profiles`) từ client-side sang server-side trong query `/api/tasks` để tối ưu hiệu năng và tránh lỗi "Unknown User".
2.  **Tự phục hồi Profile**: Cập nhật logic `GET /api/users/me` để tự động tạo profile nếu thiếu, đồng thời cấp quyền Admin mặc định cho email `macovn@gmail.com`.
3.  **Rà soát RLS**: Thiết kế lại bộ Policy đảm bảo tính riêng tư nhưng vẫn cho phép Admin theo dõi toàn bộ hệ thống.
4.  **Fix TypeScript**: Khắc phục lỗi parse ngày tháng trong Risk Analysis và đồng bộ hóa Alias `@`.

### Cách khắc phục (Resolution)
Nếu vẫn gặp lỗi role hoặc task trống sau khi deploy:
1.  **Chạy SQL Stabilization**: (Xem mục 5) Chạy SQL để reset policy và role.
2.  **Xóa Cache/Logout**: Đăng xuất và đăng nhập lại để app refresh JWT token và profile mới nhất.
3.  **Kiểm tra Assignee ID**: Đảm bảo cột `assigned_to` trong tasks trùng khớp với `id` trong profiles.

### Cách phòng tránh (Prevention)
*   **Không thêm tính năng mới** khi hệ thống core (Auth/DB) chưa ổn định.
*   Duy trì `server.ts` là nguồn tin cậy duy nhất (Single Source of Truth) cho các query phức tạp.


