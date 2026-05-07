type Props = {
  className?: string;
  size?: number;
  title?: string;
};

export function PrismWarningIcon({ className, size, title }: Props) {
  return (
    <svg
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      width={size ?? "1em"}
      height={size ?? "1em"}
      viewBox="0 0 16.0004 15"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.00022 9.99998C8.69058 9.99998 9.25022 10.5596 9.25022 11.25C9.25022 11.9403 8.69058 12.5 8.00022 12.5C7.30987 12.5 6.75022 11.9403 6.75022 11.25C6.75022 10.5596 7.30987 9.99998 8.00022 9.99998Z" />
      <path d="M8.00022 4.99998C8.55251 4.99998 9.00022 5.4477 9.00022 5.99998V8.49998C9.00022 9.05227 8.55251 9.49998 8.00022 9.49998C7.44794 9.49998 7.00022 9.05227 7.00022 8.49998V5.99998C7.00022 5.4477 7.44794 4.99998 8.00022 4.99998Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.58616 0.775371C7.26731 -0.292744 8.85604 -0.257374 9.47678 0.881816L15.7893 12.4746C16.4073 13.61 15.5941 14.9998 14.3117 15H1.68772C0.405595 14.9996 -0.406811 13.6099 0.21116 12.4746L6.52268 0.881816L6.58616 0.775371ZM2.24632 12.9629H13.7532L7.99925 2.39451L2.24632 12.9629Z"
      />
    </svg>
  );
}
