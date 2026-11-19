# Birthday Wishes - Form lời chúc sinh nhật

Website gồm form gửi lời chúc và trang quản trị. Dữ liệu được lưu trong bảng `public.wishes` trên Supabase.

## Cấu hình biến môi trường

Tạo hai biến môi trường trên dịch vụ chạy website:

- `SUPABASE_URL`: Project URL của dự án Supabase.
- `SUPABASE_SECRET_KEY`: Secret key của Supabase (chỉ dùng ở phía máy chủ, tuyệt đối không đưa vào mã HTML hoặc gửi cho người khác).

Có thể dùng `SUPABASE_SERVICE_ROLE_KEY` nếu dự án đang dùng loại khóa service_role cũ.

## Bảng dữ liệu

Bảng `public.wishes` cần có các cột `id`, `name`, `message`, `created_at`, `updated_at` như câu lệnh SQL đã tạo trước đó.

## Chạy trên máy tính

```bash
npm start
```

Thiết lập biến môi trường trước khi chạy. Trang gửi lời chúc ở `/`, trang quản trị ở `/admin`.

## Lưu ý bảo mật

Không đưa `SUPABASE_SECRET_KEY` hoặc `service_role` lên GitHub, vào HTML/JavaScript phía trình duyệt, hoặc chia sẻ công khai. Mật khẩu trang Admin hiện nằm trong mã giao diện nên chỉ phù hợp dùng thử; cần tăng cường xác thực trước khi dùng cho dữ liệu nhạy cảm.
