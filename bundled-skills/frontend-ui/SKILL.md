---
name: frontend-ui
description: "Frontend development and UI/UX implementation. Use when: creating React components, implementing designs, styling with Tailwind CSS, building UI from Figma/mockups, responsive layouts, animations, component libraries. NOT for: backend logic, database operations."
triggers:
  - frontend
  - ui
  - react
  - component
  - tailwind
  - css
  - design
  - figma
  - layout
  - responsive
  - animation
  - typescript
  - nextjs
---

# Frontend & UI Agent Skill

## Overview

This skill enables agents to build beautiful, responsive UI components using React, TypeScript, and Tailwind CSS.

## Capabilities

### Component Development
- Build React components (functional + hooks)
- TypeScript with strict typing
- Props interfaces and validation
- Storybook stories
- Unit tests for components

### Styling
- Tailwind CSS v4
- Responsive design (mobile-first)
- Dark/light theme support
- Custom design tokens
- CSS animations and transitions

### UI/UX
- Implement designs from Figma/mockups
- Accessibility (ARIA, keyboard nav)
- Form validation and UX
- Loading states and skeletons
- Error boundaries

### Integration
- Connect components to APIs
- State management (Zustand, Redux)
- Form libraries (React Hook Form)
- UI libraries (Radix, Headless UI)

## Stack

- React 19
- TypeScript 5
- Tailwind CSS v4
- Next.js 15
- Zustand (state)
- Radix UI (primitives)
- Framer Motion (animations)

## Design Principles

1. Mobile-first responsive design
2. Component composition over inheritance
3. Accessibility by default
4. Consistent spacing and typography
5. Meaningful animations

## Code Style

```tsx
// Functional component with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  loading = false
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded font-medium transition-colors",
        variant === 'primary' && "bg-blue-600 hover:bg-blue-700 text-white",
        variant === 'secondary' && "bg-gray-200 hover:bg-gray-300 text-gray-900",
        size === 'sm' && "px-3 py-1.5 text-sm",
        size === 'md' && "px-4 py-2 text-base",
        loading && "opacity-50 cursor-not-allowed"
      )}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
```

## Safety Rules

- Never use `any` type
- Always handle loading and error states
- Test components in Storybook
- Verify accessibility with keyboard nav
