import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function listenAuth(callback: (user: any) => void) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}