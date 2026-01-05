import React from "react"
import { IconProps } from "types/icon"

const Moon: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        d="M21 12.8C20.2 17.1 16.4 20.5 12 21
           7.1 21.6 3 17.8 3 13
           3 8.6 6.2 4.8 10.4 4
           9.4 5.2 8.8 6.8 8.8 8.5
           8.8 12.6 12.1 15.9 16.2 15.9
           17.9 15.9 19.5 15.3 21 14.3"
        fill={color}
      />
    </svg>
  )
}

export default Moon
