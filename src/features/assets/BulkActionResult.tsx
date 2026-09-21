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

const BulkActionResult = ({result, onClose, onRetry}: BulkActionResultProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!result) return null;

  const { appliedCount, failedItems } = result;
  const failedCount = failedItems?.length;
  const retryableItems = failedItems?.filter(
    (item) => item.code === "conflict",
  );

  const nonRetryableItems = failedItems?.filter(
    (item) => item.code !== "conflict",
  );

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
            <span className="headerTitle">
              Failure Breakdown ({failedCount})
            </span>
            <button
              type="button"
              className="retryBtn"
              disabled={retryableItems?.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.();
              }}
            >
              Retry ({retryableItems?.length})
            </button>
          </div>

          <div className="failureSummary">
            <div className="summaryItem">
              <span className="dotRetryable" />
              <span className="summaryText">
                {retryableItems?.length} retriable
              </span>
            </div>

            <div className="summaryItem">
              <span className="dotNonRetryable" />
              <span className="summaryText">
                {nonRetryableItems?.length} cannot be retried
              </span>
            </div>
          </div>

          {/* Grouped Lists: Non-retryable first, Retriable second */}
          <div className="failureList">
            {/* Group 1: Cannot Retry */}
            {nonRetryableItems?.length > 0 && (
              <div className="groupSection">
                <div className="groupTitle">
                  Cannot be retried ({nonRetryableItems?.length})
                </div>
                <ul className="groupList">
                  {nonRetryableItems.map((item, idx) => (
                    <li
                      key={item?.id ?? `non-retry-${idx}`}
                      className="failureItem"
                    >
                      <span className="itemId">Asset ID: {item?.id}</span>
                      <span className="reason">
                        {item?.message || "Asset is on legal hold."}
                      </span>
                      <span className="retryStatus cannotRetry">
                        Cannot retry
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Group 2: Retriable */}
            {retryableItems.length > 0 && (
              <div className="groupSection">
                <div className="groupTitle">
                  Can retry ({retryableItems?.length})
                </div>
                <ul className="groupList">
                  {retryableItems.map((item, idx) => (
                    <li key={item.id ?? `retry-${idx}`} className="failureItem">
                      <span className="itemId">Asset ID: {item.id}</span>
                      <span className="reason">
                        {item?.message ||
                          "Concurrent version modification detected."}
                      </span>
                      <span className="retryStatus canRetry">Retriable</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkActionResult;
