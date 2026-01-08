import { Variants } from 'framer-motion';

// Page transition variants
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 }
  }
};

// Staggered container for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

// Item animation for staggered lists
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

// Glass card hover effect
export const glassCardHover = {
  rest: {
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  }
};

// Floating animation for decorative elements
export const floatingAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

// Glow pulse for important elements
export const glowPulse = {
  boxShadow: [
    '0 0 20px rgba(76, 175, 80, 0.2)',
    '0 0 40px rgba(76, 175, 80, 0.4)',
    '0 0 20px rgba(76, 175, 80, 0.2)'
  ],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

// Slide in from direction
export const slideIn = (direction: 'left' | 'right' | 'up' | 'down', delay = 0): Variants => ({
  hidden: {
    opacity: 0,
    x: direction === 'left' ? -30 : direction === 'right' ? 30 : 0,
    y: direction === 'up' ? 30 : direction === 'down' ? -30 : 0
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
      delay
    }
  }
});

// Fade in animation
export const fadeIn = (delay = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, delay }
  }
});

// Scale up animation
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  }
};
