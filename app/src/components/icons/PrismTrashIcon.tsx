type Props = {
  className?: string;
  size?: number;
  title?: string;
};

// Prism design system "16/trash-line" icon (DoorDash). Source SVG copied
// verbatim from prism-react cypress fixtures so the geometry matches the
// design system exactly. Color follows currentColor.
export function PrismTrashIcon({ className, size, title }: Props) {
  return (
    <svg
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      width={size ?? "1em"}
      height={size ?? "1em"}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 2C5 1.44772 5.44772 1 6 1H10C10.5523 1 11 1.44772 11 2V3H14C14.5523 3 15 3.44772 15 4C15 4.55228 14.5523 5 14 5H13.5C13.5 5.04149 13.4987 5.08309 13.4961 5.12476L13.0414 12.4008C13.0349 12.5059 13.0242 12.6809 13.0012 12.8422C12.9727 13.0418 12.9073 13.3755 12.7061 13.7312C12.4566 14.1721 12.079 14.5269 11.6233 14.7484C11.2558 14.9271 10.9187 14.9714 10.7176 14.9874C10.5552 15.0003 10.3799 15.0001 10.2746 15H5.72538C5.62012 15.0001 5.44477 15.0003 5.28236 14.9874C5.08134 14.9714 4.74419 14.9271 4.37666 14.7484C3.92101 14.5269 3.54342 14.1721 3.29391 13.7312C3.09266 13.3755 3.02734 13.0418 2.99885 12.8422C2.97583 12.6809 2.96508 12.5059 2.95863 12.4008L2.5039 5.12476C2.5013 5.08309 2.5 5.04149 2.5 5H2C1.44772 5 1 4.55228 1 4C1 3.44772 1.44772 3 2 3H5V2ZM4.5 5L4.95312 12.2499C4.96963 12.514 4.97788 12.6461 5.03457 12.7462C5.08447 12.8344 5.15999 12.9054 5.25112 12.9497C5.35463 13 5.48694 13 5.75156 13H10.2484C10.5131 13 10.6454 13 10.7489 12.9497C10.84 12.9054 10.9155 12.8344 10.9654 12.7462C11.0221 12.6461 11.0304 12.514 11.0469 12.2499L11.5 5H4.5Z"
      />
    </svg>
  );
}
