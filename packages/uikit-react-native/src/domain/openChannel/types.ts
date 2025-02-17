import type React from 'react';
import type { FlatListProps } from 'react-native';

import type { UseOpenChannelMessagesOptions } from '@sendbird/uikit-chat-hooks';
import type { Icon } from '@sendbird/uikit-react-native-foundation';
import type {
  OnBeforeHandler,
  SendbirdFileMessage,
  SendbirdFileMessageCreateParams,
  SendbirdFileMessageUpdateParams,
  SendbirdMessage,
  SendbirdOpenChannel,
  SendbirdUserMessage,
  SendbirdUserMessageCreateParams,
  SendbirdUserMessageUpdateParams,
} from '@sendbird/uikit-utils';

import type { ChannelInputProps } from '../../components/ChannelInput';
import type { UserProfileContextType } from '../../contexts/UserProfileCtx';
import type { CommonComponent } from '../../types';

export type OpenChannelProps = {
  Fragment: {
    channel: SendbirdOpenChannel;
    onChannelDeleted: () => void;
    onPressHeaderLeft: OpenChannelProps['Header']['onPressHeaderLeft'];
    onPressHeaderRightWithSettings: OpenChannelProps['Header']['onPressHeaderRight'];
    onPressHeaderRightWithParticipants: OpenChannelProps['Header']['onPressHeaderRight'];
    onPressMediaMessage?: OpenChannelProps['MessageList']['onPressMediaMessage'];

    onBeforeSendUserMessage?: OnBeforeHandler<SendbirdUserMessageCreateParams>;
    onBeforeSendFileMessage?: OnBeforeHandler<SendbirdFileMessageCreateParams>;
    onBeforeUpdateUserMessage?: OnBeforeHandler<SendbirdUserMessageUpdateParams>;
    onBeforeUpdateFileMessage?: OnBeforeHandler<SendbirdFileMessageUpdateParams>;

    renderMessage?: OpenChannelProps['MessageList']['renderMessage'];
    renderNewMessagesButton?: OpenChannelProps['MessageList']['renderNewMessagesButton'];
    renderScrollToBottomButton?: OpenChannelProps['MessageList']['renderScrollToBottomButton'];

    enableMessageGrouping?: OpenChannelProps['MessageList']['enableMessageGrouping'];

    keyboardAvoidOffset?: OpenChannelProps['Provider']['keyboardAvoidOffset'];
    flatListProps?: OpenChannelProps['MessageList']['flatListProps'];
    sortComparator?: UseOpenChannelMessagesOptions['sortComparator'];
    queryCreator?: UseOpenChannelMessagesOptions['queryCreator'];
  };
  Header: {
    rightIconName: keyof typeof Icon.Assets;
    onPressHeaderLeft: () => void;
    onPressHeaderRight: () => void;
  };

  MessageList: {
    enableMessageGrouping: boolean;
    currentUserId?: string;
    channel: SendbirdOpenChannel;
    messages: SendbirdMessage[];
    nextMessages: SendbirdMessage[];
    newMessagesFromMembers: SendbirdMessage[];
    onTopReached: () => void;
    onBottomReached: () => void;

    onResendFailedMessage: (failedMessage: SendbirdUserMessage | SendbirdFileMessage) => Promise<void>;
    onDeleteMessage: (message: SendbirdUserMessage | SendbirdFileMessage) => Promise<void>;
    onPressMediaMessage?: (message: SendbirdFileMessage, deleteMessage: () => Promise<void>, uri: string) => void;

    renderMessage: (props: {
      message: SendbirdMessage;
      prevMessage?: SendbirdMessage;
      nextMessage?: SendbirdMessage;
      onPress?: () => void;
      onLongPress?: () => void;
      onPressAvatar?: UserProfileContextType['show'];
      channel: OpenChannelProps['MessageList']['channel'];
      currentUserId?: OpenChannelProps['MessageList']['currentUserId'];
      enableMessageGrouping: OpenChannelProps['MessageList']['enableMessageGrouping'];
    }) => React.ReactElement | null;
    renderNewMessagesButton: null | CommonComponent<{
      visible: boolean;
      onPress: () => void;
      newMessages: SendbirdMessage[];
    }>;
    renderScrollToBottomButton: null | CommonComponent<{
      visible: boolean;
      onPress: () => void;
    }>;
    flatListProps?: Omit<FlatListProps<SendbirdMessage>, 'data' | 'renderItem'>;
  };
  Input: Pick<
    ChannelInputProps,
    | 'shouldRenderInput'
    | 'onPressSendUserMessage'
    | 'onPressSendFileMessage'
    | 'onPressUpdateUserMessage'
    | 'onPressUpdateFileMessage'
  >;

  Provider: {
    channel: SendbirdOpenChannel;
    keyboardAvoidOffset?: number;
  };
};

/**
 * Internal context for OpenChannel
 * For example, the developer can create a custom header
 * with getting data from the domain context
 * */
export type OpenChannelContextsType = {
  Fragment: React.Context<{
    headerTitle: string;
    channel: SendbirdOpenChannel;
    messageToEdit?: SendbirdUserMessage | SendbirdFileMessage;
    setMessageToEdit: (msg?: SendbirdUserMessage | SendbirdFileMessage) => void;
    keyboardAvoidOffset?: number;
  }>;
};
export interface OpenChannelModule {
  Provider: CommonComponent<OpenChannelProps['Provider']>;
  Header: CommonComponent<OpenChannelProps['Header']>;
  MessageList: CommonComponent<OpenChannelProps['MessageList']>;
  Input: CommonComponent<OpenChannelProps['Input']>;
  StatusEmpty: CommonComponent;
  StatusLoading: CommonComponent;
}

export type OpenChannelFragment = CommonComponent<OpenChannelProps['Fragment']>;
