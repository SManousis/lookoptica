import { useContext } from "react";
import { AdminAuthContext } from "./AdminAuthContext";

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}