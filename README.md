# Sasta Bazar - Multi-Vendor E-commerce Platform

**Sasta Bazar** is a modern, feature-rich, and scalable multi-vendor e-commerce platform. It provides a seamless shopping experience for customers and a powerful dashboard for sellers to manage their products and orders. The entire backend is powered by Supabase, offering a secure and robust foundation.

![Sasta Bazar Screenshot](https://place-hold.it/1200x600?text=Project+Screenshot+Here)
*(Replace the placeholder above with a screenshot of your application)*

**Live Demo:** [https://your-project-name.vercel.app](https://your-project-name.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fsasta-bazar)

*(Remember to replace `your-username/sasta-bazar` in the button link with your actual repository URL!)*

---

## ✨ Key Features

Sasta Bazar is designed with a comprehensive set of features to support a thriving online marketplace.

### For Customers:
- **User Authentication:** Secure sign-up and login for a personalized experience.
- **Profile Management:** Users can manage their personal information and shipping addresses.
- **Product Discovery:** Browse and search for products across various categories, brands, and sellers.
- **Detailed Product Pages:** View product details, including multiple images/videos, specifications, pricing, and stock availability.
- **Order Placement:** A smooth checkout process to place orders.
- **Order History & Tracking:** View past orders and track the status of current ones (e.g., pending, delivered).
- **Product Reviews:** Leave ratings and reviews (including text and photos) for purchased products.

### For Sellers:
- **Seller Registration:** Users can register to become sellers on the platform.
- **Seller Profile:** Manage business information, including store logo, description, and contact details.
- **Product Management:** Create, update, and delete product listings. Manage details like name, description, price, stock, sizes, colors, and multiple images/videos.
- **Order Management:** View and manage incoming orders for their products. Update order statuses (e.g., 'shipped', 'delivered').
- **Automated Inventory:** Stock levels are automatically updated when an order is fulfilled.
- **Sales Analytics:** Track the number of units sold for each product.

### Platform & Architecture:
- **Multi-Vendor System:** The core architecture supports multiple sellers, each managing their own inventory and orders.
- **Role-Based Access Control (RBAC):** Securely defines what `users` and `sellers` can see and do, ensuring data privacy and integrity.
- **Scalable Database:** Built on PostgreSQL with a well-structured schema to handle profiles, products, orders, and reviews.
- **Media Storage:** Utilizes Supabase Storage for efficiently handling product images, videos, and review photos.
- **Automated Triggers:** Database functions automatically update product ratings, review counts, and stock levels in real-time.

---

## 🛠️ Tech Stack

- **Backend & Database:** **Supabase** (PostgreSQL, Auth, Storage, Edge Functions)
- **Styling:** **Tailwind CSS**
- **Frontend Framework:** *(Please specify your frontend framework, e.g., Next.js, React, Vue.js)*

---

## 🚀 Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

You will need to have a Supabase project set up.

1.  Go to Supabase and create a new project.
2.  Keep your **Project URL** and **`anon` key** handy.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/sasta-bazar.git
    cd sasta-bazar
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of your project and add your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```
    *(Note: The variable names might differ based on your project's configuration. The example uses Next.js conventions.)*

4.  **Set up the database:**
    - Navigate to the **SQL Editor** in your Supabase project dashboard.
    - Copy the entire content of the `full_database_setup.sql` file from this repository.
    - Paste it into the SQL editor and run the query. This will create all the necessary tables, roles, policies, and storage buckets.

5.  **Run the development server:**
    ```sh
    npm run dev
    ```

Open http://localhost:3000 (or your framework's default port) in your browser to see the application.

---

## 🗄️ Database Schema

The database is designed to be relational and secure, with Row Level Security (RLS) enabled on all sensitive tables.

| Table             | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `profiles`        | Stores public user profile information.                                  |
| `addresses`       | Manages user shipping addresses.                                         |
| `user_roles`      | Assigns roles (`user`, `seller`, `admin`) to users.                      |
| `seller_profiles` | Contains detailed business information for sellers.                      |
| `products`        | The main table for all product listings.                                 |
| `orders`          | Tracks all customer orders, items, and delivery status.                  |
| `product_reviews` | Stores user-submitted ratings and reviews for products.                  |
| `order_feedback`  | Collects feedback specific to an order.                                  |

### Storage Buckets

- `product-images`: Public bucket to store all product images and videos.
- `review-photos`: Public bucket for photos uploaded with product reviews.

---

## 🌐 Deployment

This project is optimized for one-click deployment on Vercel.

1.  **Fork the repository** to your GitHub account.
2.  Click the **Deploy with Vercel** button above.
3.  Follow the on-screen instructions, making sure to add your Supabase environment variables when prompted:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4.  Vercel will automatically build and deploy your project.

Your application will be live at a public URL provided by Vercel, which you can find on your project's dashboard.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📧 Contact

Your Name - @your_twitter - email@example.com

Project Link: https://github.com/your-username/sasta-bazar
