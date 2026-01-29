import React from "react"

import { IconProps } from "types/icon"

const DevicePhoneMobile: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
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
        d="M12.5 2.5H7.5C6.57953 2.5 5.82953 3.25 5.82953 4.17047V15.8295C5.82953 16.75 6.57953 17.5 7.5 17.5H12.5C13.4205 17.5 14.1705 16.75 14.1705 15.8295V4.17047C14.1705 3.25 13.4205 2.5 12.5 2.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14.17H10.0083"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default DevicePhoneMobile
