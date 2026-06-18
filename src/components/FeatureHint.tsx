import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  title: string;
  description: string;
  example?: string;
}

export default function FeatureHint({ title, description, example }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What is ${title}?`}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors align-middle ml-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-72 bg-card border-border"
      >
        <p className="text-sm font-semibold text-foreground mb-1">ⓘ {title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        {example && (
          <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
            <p className="text-[11px] text-foreground leading-relaxed">
              <span className="font-semibold">💡 Example:</span> {example}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
