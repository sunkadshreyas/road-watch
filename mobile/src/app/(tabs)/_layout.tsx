import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function ResidentTabsLayout() {
  return (
    <NativeTabs tintColor="#0f766e">
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "camera", selected: "camera.fill" }} />
        <Label>Capture</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="nearby">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Nearby</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collection">
        <Icon sf={{ default: "tray", selected: "tray.fill" }} />
        <Label>Collection</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leaderboard">
        <Icon sf={{ default: "trophy", selected: "trophy.fill" }} />
        <Label>Leaders</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
