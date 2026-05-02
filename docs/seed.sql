/* 
  SEED DATA FOR TASK MANAGEMENT SYSTEM
  Run this in Supabase SQL Editor to populate with sample data.
  Assumes you have at least one user registered (macovn@gmail.com).
*/

-- 1. Create a variable for the target user ID (Admin)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user ID for macovn@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'macovn@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User macovn@gmail.com not found. Please register first.';
  ELSE
    -- 2. Insert Sample Tasks
    INSERT INTO public.tasks (title, description, status, priority, user_id, due_date, tags)
    VALUES 
    ('Triển khai hệ thống Kanban', 'Thiết lập bảng Kanban và cấu hình các trạng thái cơ bản.', 'in_progress', 'high', v_user_id, NOW() + INTERVAL '2 days', '["Core", "UI"]'),
    ('Cấu hình RBAC cho Admin', 'Phân quyền người dùng và thiết lập bảo mật RLS.', 'todo', 'high', v_user_id, NOW() + INTERVAL '1 day', '["Security"]'),
    ('Viết tài liệu hướng dẫn sử dụng', 'Hướng dẫn nhân viên cách tạo và quản lý nhiệm vụ.', 'todo', 'medium', v_user_id, NOW() + INTERVAL '5 days', '["Docs"]'),
    ('Kiểm tra hiệu năng API', 'Đảm bảo thời gian phản hồi của server dưới 200ms.', 'done', 'low', v_user_id, NOW() - INTERVAL '1 day', '["Optimization"]'),
    ('Họp định kỳ dự án', 'Thảo luận về tiến độ và các khó khăn đang gặp phải.', 'todo', 'medium', v_user_id, NOW() + INTERVAL '3 days', '["Meeting"]'),
    ('Fix bug hiển thị trên Mobile', 'Sửa lỗi layout bị vỡ khi xem trên màn hình nhỏ.', 'in_progress', 'high', v_user_id, NOW() + INTERVAL '4 hours', '["Bug"]');
    
    RAISE NOTICE 'Seed data inserted successfully for user: %', v_user_id;
  END IF;
END $$;
