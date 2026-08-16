import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { NavLink } from "react-router";

export default function NavBar() {
  return (
    <div className="flex items-center justify-between px-4 h-14 border-b">
      <div className="font-semibold select-none">Web Media Manager</div>

      <div className="flex items-center gap-2">
        <NavLink to={"/settings"}>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </NavLink>
      </div>
    </div>
  );
}
