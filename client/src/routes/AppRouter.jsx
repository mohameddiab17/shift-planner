import { BrowserRouter, Routes, Route } from "react-router";
import routesConfig from "./routesConfig";
import ProtectedRoute from "./ProtectedRoute";
import Sidebar from "../components/Sidebar";


const userRole = "admin";
// superadmin , admin , employee


export default function AppRouter() {
  const roleRoutes = routesConfig[userRole] || [];

  return (
    <BrowserRouter>

      <Sidebar role={userRole} />
      
      <div className="text-red-600">
        <Routes>
          {roleRoutes.map(route => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute
                  element={route.element}
                  role={userRole}
                  // any role can access its own routes
                  allowed={[userRole]}
                />
              }
            />
          ))}

          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </div>


    </BrowserRouter>
  );
}
