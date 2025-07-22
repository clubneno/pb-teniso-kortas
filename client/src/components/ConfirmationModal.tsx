import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Patvirtinti",
  cancelText = "Atšaukti",
  isDestructive = false,
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={`h-5 w-5 ${isDestructive ? 'text-red-500' : 'text-yellow-500'}`} />
              {title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 leading-relaxed">
            {message}
          </p>
          
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isLoading}
              className={isDestructive ? "" : "bg-tennis-green-500 hover:bg-tennis-green-600"}
            >
              {isLoading ? "Vykdoma..." : confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}