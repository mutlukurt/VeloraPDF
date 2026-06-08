import { Pressable, StyleSheet, View } from "react-native";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { annotationColors } from "@/theme/tokens";

const colors = [
  annotationColors.yellow,
  annotationColors.green,
  annotationColors.purple,
  annotationColors.pink,
  annotationColors.blue,
  annotationColors.inkPurple,
  annotationColors.inkRed,
  annotationColors.inkDark
];

export function ColorPicker() {
  const active = useAnnotationStore((state) => state.color);
  const setColor = useAnnotationStore((state) => state.setColor);
  return (
    <View style={styles.row}>
      {colors.map((color) => (
        <Pressable
          key={color}
          onPress={() => setColor(color)}
          style={[styles.swatch, { backgroundColor: color, borderColor: active === color ? "#FFFFFF" : "rgba(255,255,255,0.22)", transform: [{ scale: active === color ? 1.08 : 1 }] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { borderRadius: 8, borderWidth: 2, height: 34, width: 34 }
});
