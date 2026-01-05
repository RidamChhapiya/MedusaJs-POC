import React from "react"

import { IconProps } from "types/icon"

const ThemeToggleIcon: React.FC<IconProps & { isDark: boolean }> = ({
  size = "20",
  color = "currentColor",
  isDark,
  ...attributes
}) => {
  if (isDark) {
    // Sun icon for dark mode (clicking will switch to light) - filled sun
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...attributes}
      >
        <circle
          cx="10"
          cy="10"
          r="3"
          fill={color}
          className="transition-all duration-300"
        />
        <path
          d="M10 2.5V1M10 19V17.5M17.5 10H19M1 10H2.5M15.182 4.818L16.364 3.636M3.636 16.364L4.818 15.182M15.182 15.182L16.364 16.364M3.636 3.636L4.818 4.818"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
    )
  } else {
    // Moon icon for light mode (clicking will switch to dark) - filled crescent moon
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...attributes}
      >
        <path
          d="M17.293 13.293C16.3785 14.2075 15.2175 14.7758 14 14.9281C12.7825 15.0804 11.5455 14.8083 10.4645 14.1414C9.3835 13.4745 8.5157 12.4456 7.96818 11.2228C7.42066 10 7.21649 8.62903 7.3839 7.28406C7.55131 5.93909 8.08159 4.67834 8.90381 3.65685C9.72603 2.63536 10.8014 1.89991 12 1.537C11.5252 2.54944 11.3366 3.67919 11.4551 4.79499C11.5736 5.91078 11.9944 6.96728 12.6757 7.84853C13.357 8.72978 14.2734 9.40308 15.3147 9.79629C16.356 10.1895 17.4841 10.2889 18.574 10.0849C17.8507 11.1769 17.0018 12.1895 16.043 13.1L17.293 13.293Z"
          fill={color}
          className="transition-all duration-300"
        />
      </svg>
    )
  }
}

export default ThemeToggleIcon

