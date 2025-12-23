// import App from "../App";
import { createBrowserRouter } from "react-router";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "@/screens/Dashboard/Dashboard";

const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [{ index: true, Component: Dashboard }],
  },
]);

export default router;
