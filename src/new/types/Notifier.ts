export interface INotifier {
    notify: (message: string) => Promise<void>;
}
