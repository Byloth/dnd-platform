import { NetworkException } from "@byloth/core";
import { HandledException, HandlerBuilder } from "@byloth/exceptions";

/**
 * The application's last line of error handling, from the template: errors that escape a component
 * or a promise become an alert (docs/phase-1/01-web-application.md). Called once, in app.vue.
 */
export const useErrorsHandler = () =>
{
    const $vuert = useVuert();
    const { t } = useI18n();

    const _handler = new HandlerBuilder()
        .on(NetworkException, (exc) =>
        {
            $vuert.emit({
                type: "error",
                icon: "link-slash",
                title: t("errors.network.title"),
                message: t("errors.network.message", { message: exc.message }),
                dismissible: true
            });

            return new HandledException(exc);
        })
        .default((exc) =>
        {
            // eslint-disable-next-line no-console
            console.error(exc);

            $vuert.emit({
                type: "error",
                icon: "circle-xmark",
                title: t("errors.unexpected.title"),
                message: t("errors.unexpected.message"),
                dismissible: true
            });
        });

    const errorHandler = (error: unknown) =>
    {
        const result = _handler.handle(error);
        if (result instanceof HandledException)
        {
            // eslint-disable-next-line no-console
            console.warn(result);
        }

        return false;
    };

    onMounted(() =>
    {
        onErrorCaptured(errorHandler);

        window.addEventListener("unhandledrejection", (evt: PromiseRejectionEvent) =>
        {
            evt.preventDefault();

            errorHandler(evt.reason);
        });
    });
};
