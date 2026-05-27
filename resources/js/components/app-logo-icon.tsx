import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient
                    id="bgGradient"
                    x1="64"
                    y1="64"
                    x2="448"
                    y2="448"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#4F46E5" />
                    <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
                <linearGradient
                    id="cardGradient"
                    x1="120"
                    y1="120"
                    x2="392"
                    y2="392"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#FFFFFF" stopOpacity="0.98" />
                    <stop offset="1" stopColor="#E0F2FE" stopOpacity="0.95" />
                </linearGradient>
                <filter
                    id="shadow"
                    x="0"
                    y="0"
                    width="512"
                    height="512"
                    filterUnits="userSpaceOnUse"
                >
                    <feDropShadow
                        dx="0"
                        dy="12"
                        stdDeviation="18"
                        floodOpacity="0.18"
                    />
                </filter>
            </defs>
            <rect
                x="40"
                y="40"
                width="432"
                height="432"
                rx="96"
                fill="url(#bgGradient)"
            />
            <g filter="url(#shadow)">
                <rect
                    x="112"
                    y="112"
                    width="288"
                    height="288"
                    rx="48"
                    fill="url(#cardGradient)"
                />
            </g>
            <rect
                x="168"
                y="210"
                width="176"
                height="116"
                rx="24"
                fill="#4F46E5"
            />
            <path
                d="M208 210V186C208 169.431 221.431 156 238 156H274C290.569 156 304 169.431 304 186V210"
                stroke="#4F46E5"
                strokeWidth="18"
                strokeLinecap="round"
            />
            <circle cx="332" cy="332" r="44" fill="#06B6D4" />
            <path
                d="M312 332L326 346L354 318"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M184 262H328"
                stroke="#A5B4FC"
                strokeWidth="10"
                strokeLinecap="round"
            />
            <path
                d="M184 294H280"
                stroke="#C4B5FD"
                strokeWidth="10"
                strokeLinecap="round"
            />
        </svg>
    );
}
