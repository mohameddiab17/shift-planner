import Dashboard from "./pages/admin/Dashboard/Dashboard";
import AppRouter from "./routes/AppRouter";

function App() {

  return (
    <div className="app-layout flex">

      <div className="flex-1">
        {/* <AppRouter /> */}
        <Dashboard />
      </div>

    </div>
  )
}

export default App
