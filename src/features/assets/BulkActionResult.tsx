import { useState } from "react";
import "../../styles/BulkActionResult.scss";
import { AssetStatus } from "@/lib/types";

export interface BulkFailureItem {
  id: string;
  code: string;
  message: string;
  ok: boolean;
}

export interface BulkActionResultData {
  appliedCount: number;
  failedItems: BulkFailureItem[];
  status: AssetStatus;
}

interface BulkActionResultProps {
  result: BulkActionResultData | null;
  onClose?: () => void;
  onRetry?: () => void;
}

const BulkActionResult = ({ result, onClose, onRetry }: BulkActionResultProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!result) return null;

  const { appliedCount, failedItems } = result;
  const failedCount = failedItems?.length;

  return (
    <div className="container">
      <div className={`badge ${failedCount > 0 ? "hasFailures" : ""}`}
        onClick={() => failedCount > 0 && setIsOpen((prev) => !prev)}
        role={failedCount > 0 ? "button" : undefined}
      >
        <div className="sectionSuccess">
          <span className="dotSuccess" />
          <span className="textSuccess">{appliedCount} updated</span>
        </div>

        {failedCount > 0 && (
          <>
            <span className="divider">|</span>
            <div className="sectionFailed">
              <span className="dotFailed" />
              <span className="textFailed">{failedCount} failed</span>
              <svg
                className={`arrow ${isOpen ? "arrowOpen" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </>
        )}

        {onClose && (
          <button
            type="button"
            className="closeBtn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Details Dropdown */}
      {isOpen && failedCount > 0 && (
        <div className="dropdown">
          <div className="dropdownHeader">
            <span>Failure Breakdown ({failedCount})</span>
            <button
              type="button"
              className="retryBtn"
              disabled
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.();
              }}
            >
              Retry ({failedCount})
            </button>
          </div>
          <ul className="failureList">
            {failedItems.map((item, idx) => (
              <li key={item.id || idx} className="failureItem">
                <span className="itemId">Asset ID: {item.id}</span>
                <span className="reason">
                  {item.message || "Locked or insufficient permissions"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BulkActionResult;
