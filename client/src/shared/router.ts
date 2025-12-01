// import App from "../App";
import { createBrowserRouter } from "react-router";
import MainLayout from "./layouts/MainLayout";
import Home from "@/screens/home/Home";

const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      {index: true, Component: Home}
    ]
  },
]);

export default router;