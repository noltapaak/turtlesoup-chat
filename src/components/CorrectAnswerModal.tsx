'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CorrectAnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  answer: string;
  explanation: string;
}

export default function CorrectAnswerModal({
  isOpen,
  onClose,
  answer,
  explanation,
}: CorrectAnswerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>정답입니다!</DialogTitle>
          <DialogDescription className="py-4">
            <p className="font-bold text-lg">{answer}</p>
            <p className="mt-2">{explanation}</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 