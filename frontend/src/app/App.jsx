import { useRoutes } from "react-router-dom";
import { routes } from "./routes";
import { ThemeProvider } from "../shared/contexts/ThemeContext";

export default function App() {
  const element = useRoutes(routes);
  return <ThemeProvider>{element}</ThemeProvider>;
}
