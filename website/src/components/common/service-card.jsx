import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { icons, CircleHelp } from "lucide-react";

export function ServiceCard({ service }) {
  const iconName = service.icon?.trim();
  const Icon = icons[iconName] ?? CircleHelp;

  return (
    <Card className="group flex min-h-44 flex-col justify-between transition hover:-translate-y-1 hover:shadow-lg">
      <div className="space-y-2">
        <div className="flex gap-2 justify-between">
          <div>
            <h3 className="text-base font-semibold">{service.name}</h3>
            <p className="text-sm text-muted-foreground">
              {service.description || "Service details will be added soon."}
            </p>
          </div>
           <Icon className="h-12 w-12 text-primary mt-1" />
        </div>
      </div>

      <div className="pt-4 text-right">
        <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
          View details
        </Link>
      </div>
    </Card>
  );
}