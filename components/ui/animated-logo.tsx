"use client";

import { motion } from "framer-motion";
import { Anchor } from "lucide-react";

export function AnimatedLogo() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        duration: 0.8,
      }}
      className="w-16 h-16 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex items-center justify-center mb-6 overflow-hidden relative group"
    >
      {/* Background sweep animation */}
      <motion.div
        className="absolute inset-0 bg-primary/10"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut",
          repeatDelay: 1,
        }}
      />
      
      {/* Bouncing/Rocking Anchor */}
      <motion.div
        animate={{ 
          rotate: [0, -10, 10, -5, 5, 0],
          y: [0, -4, 0] 
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut",
          repeatDelay: 2
        }}
      >
        <Anchor className="h-8 w-8 text-primary relative z-10" />
      </motion.div>
    </motion.div>
  );
}
