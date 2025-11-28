import { Navigate } from "react-router";

export default function ProtectedRoute({ 
    element: Component,
    allowed,
    role
 }) {

  if (!role) return <Navigate to="/login" replace />;
  
  if (!allowed.includes(role)) 
    return <Navigate to="/unauthorized" replace />;
  
  return <Component />;
}
