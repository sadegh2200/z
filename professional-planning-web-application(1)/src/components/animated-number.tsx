"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { fa } from "@/lib/core";

/** عدد متحرک فنری — برای کیف پول و امتیازهای در حال تغییر */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  const text = useTransform(spring, (v) => fa(Math.round(v)));
  return <motion.span className={className}>{text}</motion.span>;
}
