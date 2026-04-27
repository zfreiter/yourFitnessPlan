import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorTheme } from "@/context/colorThemeContext";

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeButtonText?: string;
}

const CustomModal = ({
  visible,
  onClose,
  onDismiss,
  title,
  children,
  showCloseButton = true,
  closeButtonText = "Close",
}: CustomModalProps) => {
  const { theme } = useColorTheme();

  const handleBackdropPress = onDismiss ?? onClose;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleBackdropPress}
    >
      {/* Backdrop — tapping here dismisses */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          {/* Stop touches on the card from bubbling to the backdrop */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: theme.color.surface,
                  shadowColor: theme.color.shadow,
                },
              ]}
            >
              {/* X close button — sits above the title */}
              <TouchableOpacity
                onPress={handleBackdropPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.xButton}
                activeOpacity={0.6}
              >
                <MaterialIcons
                  name="cancel"
                  size={30}
                  color={theme.color.accent}
                />
              </TouchableOpacity>

              {/* Header */}
              {title && (
                <View
                  style={[
                    styles.header,
                    { borderBottomColor: theme.color.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.title,
                      {
                        fontFamily: theme.fonts.headerBody,
                        color: theme.color.textPrimary,
                      },
                    ]}
                  >
                    {title}
                  </Text>
                </View>
              )}

              {/* Content */}
              <ScrollView
                style={styles.content}
                contentContainerStyle={{ flex: 1, justifyContent: "center" }}
              >
                {children}
              </ScrollView>

              {/* Footer with confirm button */}
              {showCloseButton && (
                <View
                  style={[
                    styles.footer,
                    { borderTopColor: theme.color.accent },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.closeButton,
                      { backgroundColor: theme.color.accent },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.closeButtonText,
                        {
                          fontFamily: theme.fonts.body,
                          color: theme.color.textPrimary,
                        },
                      ]}
                    >
                      {closeButtonText}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: Dimensions.get("window").width * 0.8,
    width: Dimensions.get("window").width * 0.7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  xButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 15,
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  content: {
    flex: 1,

    paddingVertical: 10,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 15,
    marginTop: 15,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CustomModal;
