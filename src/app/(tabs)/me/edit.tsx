import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { DEMO } from "@/data/seed";
import { TAG_COOLDOWN_DAYS, useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";
import { overlay } from "@/stores/use-overlay-store";
import { RowIcon } from "@/components/list";

const PICKER: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 };

/** Personal details: photo (camera or library), names, email and the @tag (30-day cooldown). */
export default function EditProfile() {
  const c = useColors();
  const user = useSessionStore((s) => s.user);
  const avatarUri = useSessionStore((s) => s.avatarUri);
  const tagChangedAt = useSessionStore((s) => s.tagChangedAt);
  const setUser = useSessionStore((s) => s.setUser);
  const changeTag = useSessionStore((s) => s.changeTag);
  const setAvatar = useSessionStore((s) => s.setAvatar);

  const [first, setFirst] = useState(user.firstName);
  const [last, setLast] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [tag, setTag] = useState(user.tag);

  const [now] = useState(() => Date.now());
  const nextTagChange = tagChangedAt ? new Date(new Date(tagChangedAt).getTime() + TAG_COOLDOWN_DAYS * 864e5) : null;
  const tagLocked = !!nextTagChange && nextTagChange.getTime() > now;
  const cleanTag = tag.replace(/^@/, "").toLowerCase();
  const tagChanged = cleanTag !== user.tag;
  const tagFormatOk = /^[a-z0-9_.]{3,20}$/.test(cleanTag);
  const tagTaken = tagChanged && (DEMO.takenTags as readonly string[]).includes(cleanTag);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const dirty = first.trim() !== user.firstName || last.trim() !== user.lastName || email.trim() !== user.email || tagChanged;
  const valid = first.trim().length > 0 && last.trim().length > 0 && emailOk && (!tagChanged || (tagFormatOk && !tagTaken));

  const tagHint = tagLocked
    ? `You can change your tag again on ${nextTagChange!.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`
    : !tagChanged
      ? `Your tag can change once every ${TAG_COOLDOWN_DAYS} days.`
      : !tagFormatOk
        ? "3–20 letters, numbers, dots or underscores."
        : tagTaken
          ? `@${cleanTag} is taken.`
          : `@${cleanTag} is available`;

  const pick = async (from: "camera" | "library") => {
    if (from === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        overlay.notice({ icon: "camera", tone: "brand", title: "Camera access needed", body: "Allow camera access in Settings to take a profile photo.", actions: [{ label: "Open Settings", onPress: () => Linking.openSettings() }, { label: "Not now", tone: "secondary" }] });
        return;
      }
    }
    const res = from === "camera" ? await ImagePicker.launchCameraAsync(PICKER) : await ImagePicker.launchImageLibraryAsync(PICKER);
    // Demo: the picker's file URI is stored as-is. A real build uploads it and stores the CDN URL.
    if (!res.canceled && res.assets[0]) {
      setAvatar(res.assets[0].uri);
      toast("Photo updated");
    }
  };

  const changePhoto = () =>
    overlay.select({
      title: "Profile photo",
      options: [
        { value: "camera", label: "Take a photo", leading: <RowIcon name="camera" tint={c.brandText} bg={c.brandSoft} /> },
        { value: "library", label: "Choose from library", leading: <RowIcon name="photo" tint={c.brandText} bg={c.brandSoft} /> },
        ...(avatarUri ? [{ value: "remove", label: "Remove photo", destructive: true, leading: <RowIcon name="trash" tint={c.danger} bg={c.dangerSoft} /> }] : []),
      ],
      onSelect: (v) => (v === "remove" ? setAvatar(null) : pick(v as "camera" | "library")),
    });

  return (
    <Screen
      footer={
        <Button
          title="Save changes"
          disabled={!dirty || !valid}
          onPress={() => {
            setUser({ firstName: first.trim(), lastName: last.trim(), email: email.trim() });
            if (tagChanged) changeTag(cleanTag);
            toast("Profile saved");
            router.back();
          }}
        />
      }
    >
      <View style={{ alignItems: "center", gap: spacing.smd, paddingTop: spacing.sm }}>
        <PressableScale onPress={changePhoto} accessibilityLabel="Change profile photo">
          <Avatar size={104} name={`${first} ${last}`} uri={avatarUri} />
          <View style={{ position: "absolute", right: 2, bottom: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.bg }}>
            <Icon name="camera" size={13} color={c.onBrand} />
          </View>
        </PressableScale>
        <PressableScale onPress={changePhoto} hitSlop={8}>
          <Text variant="subhead" tone="brand">
            {avatarUri ? "Change photo" : "Add a photo"}
          </Text>
        </PressableScale>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.smd }}>
        <View style={{ flex: 1 }}>
          <Field label="First name" value={first} onChangeText={setFirst} autoCapitalize="words" textContentType="givenName" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Last name" value={last} onChangeText={setLast} autoCapitalize="words" textContentType="familyName" />
        </View>
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" hint={emailOk ? undefined : "Enter a valid email"} hintTone="danger" />
      <Field
        label="Tribe tag"
        value={tag}
        onChangeText={(v) => setTag(v.replace(/^@/, "").replace(/\s/g, ""))}
        autoCapitalize="none"
        editable={!tagLocked}
        leading={<Text variant="bodyStrong" tone="muted">@</Text>}
        hint={tagHint}
        hintTone={tagChanged && (!tagFormatOk || tagTaken) ? "danger" : tagChanged ? "success" : "muted"}
      />
      <Field label="Phone" value={user.phone} editable={false} hint="To change your number, contact support. We re-verify it for your safety." />
    </Screen>
  );
}
