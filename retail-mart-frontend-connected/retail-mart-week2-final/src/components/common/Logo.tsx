import { type ImgHTMLAttributes } from "react";
import logoSrc from "@/assets/retail-mart-logo.png";
import logo2xSrc from "@/assets/retail-mart-logo-2x.png";
import { cn } from "@/utils/cn";

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  alt?: string;
}

const SIZE_MAP = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-[42px] w-[42px]",
  xl: "h-13 w-13",
};

export function Logo({
  size = "md",
  className,
  alt = "Retail Mart logo",
  style,
  ...rest
}: LogoProps) {
  const sizeClass = typeof size === "string" ? SIZE_MAP[size] : undefined;
  const customStyle =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px`, ...style }
      : style;

  return (
    <img
      src={logoSrc}
      srcSet={`${logoSrc} 1x, ${logo2xSrc} 2x`}
      alt={alt}
      style={customStyle}
      className={cn(
        "shrink-0 object-contain select-none",
        sizeClass,
        className
      )}
      loading="eager"
      decoding="async"
      {...rest}
    />
  );
}

export default Logo;
