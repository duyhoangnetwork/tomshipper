# 🚚 TOM SHIPPER
### Smart Delivery Management System

<p align="center">
  <strong>BY DUY HOANG NETWORK</strong>
</p>

<p align="center">
  Hệ thống quản lý đơn hàng và hỗ trợ giao hàng thông minh, tối ưu cho điện thoại và máy tính.
</p>

<p align="center">
  <a href="https://aistudio.google.com/">Google AI Studio</a>
  ·
  <a href="#-tính-năng">Tính năng</a>
  ·
  <a href="#-cài-đặt">Cài đặt</a>
  ·
  <a href="#-liên-hệ">Liên hệ</a>
</p>

---

## 🌐 Giới thiệu

**Tom Shipper** là ứng dụng hỗ trợ quản lý đơn hàng và quy trình giao hàng, được phát triển với định hướng đơn giản, trực quan, dễ sử dụng và tối ưu trải nghiệm trên thiết bị di động.

Ứng dụng giúp người giao hàng theo dõi đơn đang chờ, quản lý thông tin khách hàng, cập nhật trạng thái giao hàng, lưu ảnh xác nhận và xem lại lịch sử hoạt động.

Tom Shipper hướng đến việc xây dựng một công cụ quản lý giao hàng hiện đại, kết hợp giao diện Liquid Glass cùng trải nghiệm thao tác nhanh chóng.

## ✨ Tính năng

### 📦 Quản lý đơn hàng
- Thêm đơn hàng nhanh chóng.
- Hỗ trợ nhập nhiều đơn hàng.
- Quản lý thông tin khách hàng.
- Lưu tên, số điện thoại, địa chỉ và ghi chú.
- Chỉnh sửa thông tin đơn hàng.
- Tìm kiếm đơn hàng theo tên khách hàng.
- Hiển thị trạng thái đơn hàng trực quan.

### 🚚 Theo dõi giao hàng
- Quản lý danh sách đơn đang chờ giao.
- Cập nhật trạng thái hoàn thành.
- Hỗ trợ hủy đơn hàng.
- Giữ lại các đơn chưa giao khi chuyển sang ngày mới.
- Ghi nhận thời gian hoàn thành đơn hàng.

### 📸 Ảnh xác nhận giao hàng
- Hỗ trợ chụp ảnh bằng camera điện thoại.
- Lưu ảnh xác nhận theo từng đơn hàng.
- Xem lại ảnh đã lưu.
- Xóa ảnh xác nhận độc lập với dữ liệu đơn hàng.
- Hỗ trợ tải và lưu ảnh xác nhận.
- Hiển thị thông tin đơn hàng và dấu nhận diện thương hiệu trên ảnh.

### 📊 Thống kê và lịch sử
- Theo dõi đơn hàng đã hoàn thành.
- Xem lịch sử giao hàng theo ngày.
- Thống kê số lượng đơn hàng.
- Theo dõi đơn chờ giao, đã hoàn thành và đã hủy.
- Hỗ trợ tổng hợp hoạt động giao hàng theo thời gian.

### 🎨 Giao diện người dùng
- Thiết kế Liquid Glass hiện đại.
- Hiệu ứng kính mờ và trong suốt.
- Hiệu ứng chuyển động mềm mại.
- Nền nhận diện thương hiệu DUY HOANG NETWORK.
- Thẻ thông tin bo góc và hiệu ứng ánh sáng.
- Tối ưu thao tác cảm ứng.
- Tương thích màn hình điện thoại và máy tính.

## 🛠️ Công nghệ sử dụng

| Công nghệ | Vai trò |
|---|---|
| HTML5 | Xây dựng cấu trúc giao diện |
| CSS3 | Thiết kế và hiệu ứng giao diện |
| JavaScript | Xử lý logic ứng dụng |
| Vite | Môi trường phát triển và đóng gói |
| Node.js | Môi trường chạy công cụ phát triển |
| npm | Quản lý thư viện và dependencies |
| LocalStorage | Lưu trữ dữ liệu cục bộ |
| Canvas API | Xử lý ảnh xác nhận |

## 🚀 Cài đặt

### 1. Yêu cầu hệ thống

- Node.js phiên bản phù hợp với dependencies của dự án.
- npm.
- Trình duyệt Chrome, Edge, Safari hoặc trình duyệt hiện đại tương thích.

### 2. Tải mã nguồn

```bash
git clone YOUR_REPOSITORY_URL
```

Di chuyển vào thư mục dự án:

```bash
cd TOM-SHIPPER
```

### 3. Cài đặt dependencies

```bash
npm install
```

### 4. Cấu hình môi trường

Nếu dự án sử dụng biến môi trường, sao chép `.env.example` thành `.env.local` và điền các giá trị cần thiết.

Không công khai API key hoặc thông tin bí mật lên GitHub.

### 5. Khởi chạy ứng dụng

```bash
npm run dev
```

Sau khi chạy thành công, truy cập địa chỉ localhost được Vite hiển thị trong terminal.

### 6. Build ứng dụng

```bash
npm run build
```

### 7. Xem trước bản build

```bash
npm run preview
```

*Lưu ý: Các lệnh trên cần được đối chiếu với mục `scripts` trong package.json của dự án.*

## 📱 Khả năng tương thích

Tom Shipper được định hướng sử dụng trên:

- Windows.
- macOS.
- Android.
- iOS.
- Máy tính bảng.
- Điện thoại thông minh.

Giao diện được thiết kế theo hướng Responsive, ưu tiên thao tác cảm ứng và khả năng hiển thị trên màn hình nhỏ.

## 🔐 Dữ liệu và quyền riêng tư

- Dữ liệu được lưu trữ cục bộ bằng LocalStorage nếu ứng dụng sử dụng cơ chế này.
- Ảnh xác nhận có thể được lưu dưới dạng dữ liệu Base64.
- Việc xóa ảnh xác nhận không đồng nghĩa với xóa đơn hàng.
- Dữ liệu trình duyệt có thể mất khi người dùng xóa dữ liệu trang web hoặc bộ nhớ trình duyệt.
- Không nên xem LocalStorage là giải pháp sao lưu dữ liệu lâu dài.
- Không nhập thông tin nhạy cảm không cần thiết vào ứng dụng.

**Lưu ý:** Lưu trữ cục bộ không tự động đồng bộ dữ liệu giữa nhiều thiết bị.

## 🏢 Thương hiệu

**DUY HOANG NETWORK**

Đội ngũ chuyên nghiệp trong lĩnh vực phát triển website, công cụ và giải pháp phần mềm.

Tom Shipper là một sản phẩm thuộc hệ sinh thái Duy Hoang Network, hướng đến trải nghiệm sử dụng hiện đại, tiện lợi và hiệu quả.

**Product:** TOM SHIPPER  
**Brand:** DUY HOANG NETWORK  
**Developer:** Duy Hoang Network

## 📩 Liên hệ

- **Email:** duyhoangnetwork@gmail.com
- **Zalo:** 0385933633
- **Hotline:** 0964493987

## 📄 Bản quyền

© 2026 **DUY HOANG NETWORK**. All Rights Reserved.

Tom Shipper – Smart Delivery Management System.

Designed & Developed by **DUY HOANG NETWORK**.

