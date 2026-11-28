// src/components/ui/index.js
// Exportar todos los componentes de UI animados

// animationVariants.js
export {
  fadeVariants,
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  scaleVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "./animationVariants";

// AnimatedComponents.jsx (all animation components consolidated here)
export {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  SlideUp,
  ScaleIn,
  SlideInLeft,
  SlideInRight,
  AnimatedModal,
  AnimatedCard,
  AnimatedButton,
  Skeleton,
  PageTransition,
} from "./AnimatedComponents";

// DashboardComponents.jsx - Reusable dashboard components
export { StatCard, QuickAction } from "./DashboardComponents";
