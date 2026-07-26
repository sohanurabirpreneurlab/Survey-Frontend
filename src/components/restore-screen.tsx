import { BrandMark } from "./brand-mark";
import { Spinner } from "./ui/spinner";

export const RestoreScreen = ({ message }: { message: string }) => (
  <div className="restore-screen">
    <div className="restore-card">
      <BrandMark />
      <div className="restore-status">
        <Spinner />
        <p>{message}</p>
      </div>
    </div>
  </div>
);
