import React, { forwardRef } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  TextInput as RNTextInput,
  TextInputSelectionChangeEventData,
  View,
} from 'react-native';

import { Button, TextInput, createStyleSheet, useToast } from '@sendbird/uikit-react-native-foundation';
import type { SendbirdFileMessage, SendbirdUserMessage } from '@sendbird/uikit-utils';

import { useLocalization, useSendbirdChat } from '../../../../hooks/useContext';
import type { MentionedUser } from '../../../../types';
import type { GroupChannelProps } from '../../types';

type EditInputProps = GroupChannelProps['Input'] & {
  text: string;
  onChangeText: (val: string) => void;
  editMessage: SendbirdUserMessage | SendbirdFileMessage;
  setEditMessage: (msg?: SendbirdUserMessage | SendbirdFileMessage) => void;
  onSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  disabled: boolean;
  autoFocus: boolean;
  mentionedUsers: MentionedUser[];
};

const EditInput = forwardRef<RNTextInput, EditInputProps>(function EditInput(
  {
    text,
    onChangeText,
    editMessage,
    setEditMessage,
    onUpdateUserMessage,
    onSelectionChange,
    disabled,
    autoFocus,
    mentionedUsers,
  },
  ref,
) {
  const { mentionManager } = useSendbirdChat();
  const { STRINGS } = useLocalization();
  const toast = useToast();

  const onPressCancel = () => {
    setEditMessage();
    onChangeText('');
  };

  const onPressSave = () => {
    if (editMessage.isUserMessage()) {
      onUpdateUserMessage(text, editMessage).catch(() => toast.show(STRINGS.TOAST.UPDATE_MSG_ERROR, 'error'));
    }
    setEditMessage();
    onChangeText('');
  };

  return (
    <View style={styles.editInputContainer}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={ref}
          multiline
          disableFullscreenUI
          editable={!disabled}
          autoFocus={autoFocus}
          value={text}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder={STRINGS.GROUP_CHANNEL.INPUT_PLACEHOLDER_ACTIVE}
          onSelectionChange={onSelectionChange}
        >
          {mentionManager.textToMentionedComponents(text, mentionedUsers)}
        </TextInput>
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row' }}>
        <Button variant={'text'} onPress={onPressCancel}>
          {STRINGS.GROUP_CHANNEL.INPUT_EDIT_CANCEL}
        </Button>
        <View style={styles.space} />
        <Button variant={'contained'} onPress={onPressSave}>
          {STRINGS.GROUP_CHANNEL.INPUT_EDIT_OK}
        </Button>
      </View>
    </View>
  );
});

const styles = createStyleSheet({
  editInputContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 4,
    minHeight: 36,
    maxHeight: 36 * Platform.select({ ios: 2.5, default: 2 }),
    borderRadius: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
  },
  space: {
    flex: 1,
  },
});

export default EditInput;
