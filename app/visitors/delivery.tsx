// @ts-nocheck
import { useEffect } from "react";
import { router } from "expo-router";

export default function DeliveryRedirect() {
  useEffect(() => {
    router.replace({ pathname: "/visitors", params: { visitorType: "DELIVERY" } });
  }, []);
  return null;
}
