import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import Popup, { PopupColor } from "@/src/components/popup/popup";

interface PopupConfig {
  message: string;
  color: PopupColor;
  duration: number;
}

type PopupState = (PopupConfig & { id: number }) | null;
type PopupSetter = (cfg: PopupConfig) => void;
type PopupAnchorSetter = (x: number | null) => void;

const PopupContext = createContext<PopupSetter>(() => {});
const PopupAnchorXContext = createContext<number | null>(null);
const PopupAnchorSetterContext = createContext<PopupAnchorSetter>(() => {});

export const PopupProvider = ({ children }: { children: ReactNode }) => {
  const [popup, setPopupState] = useState<PopupState>(null);
  const [popupAnchorX, setPopupAnchorXState] = useState<number | null>(null);

  const setPopup = useCallback((cfg: PopupConfig) => {
    setPopupState({ ...cfg, id: Date.now() });
  }, []);
  const setPopupAnchorX = useCallback<PopupAnchorSetter>((x) => {
    setPopupAnchorXState((current) => {
      if (x == null) return null;
      if (!Number.isFinite(x)) return current;
      return x;
    });
  }, []);

  const hidePopup = useCallback((id: number) => {
    setPopupState((current) => {
      if (!current || current.id !== id) {
        return current;
      }
      return null;
    });
  }, []);

  return (
    <PopupAnchorSetterContext.Provider value={setPopupAnchorX}>
      <PopupAnchorXContext.Provider value={popupAnchorX}>
        <PopupContext.Provider value={setPopup}>
          {children}
          {popup && (
            <Popup
              key={popup.id}
              message={popup.message}
              color={popup.color}
              duration={popup.duration}
              onHide={() => hidePopup(popup.id)}
              anchorX={popupAnchorX}
            />
          )}
        </PopupContext.Provider>
      </PopupAnchorXContext.Provider>
    </PopupAnchorSetterContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
export const usePopupAnchorX = () => useContext(PopupAnchorXContext);
export const usePopupAnchorSetter = () => useContext(PopupAnchorSetterContext);
